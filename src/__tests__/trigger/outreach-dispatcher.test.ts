import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

// Mock the generate-user-drafts module
vi.mock("@/trigger/generate-user-drafts", () => ({
  generateUserDrafts: {
    trigger: vi.fn().mockResolvedValue({ id: "run-123" }),
  },
}));

// Mock process-user-meetings (imported transitively by meeting-dispatcher)
vi.mock("@/trigger/process-user-meetings", () => ({
  processUserMeetings: {
    trigger: vi.fn().mockResolvedValue({ id: "run-456" }),
  },
}));

// Mock transitive dependencies of process-user-meetings
vi.mock("@/lib/granola/client", () => ({
  getOrRefreshAccessToken: vi.fn(),
  getGranolaDocuments: vi.fn(),
  getGranolaTranscript: vi.fn(),
}));
vi.mock("@/lib/ai/extract-contacts", () => ({
  extractContactsFromTranscript: vi.fn(),
}));
vi.mock("@/lib/crypto/encryption", () => ({
  decrypt: vi.fn(),
}));

// Mock @trigger.dev/sdk
vi.mock("@trigger.dev/sdk", () => ({
  schedules: {
    task: vi.fn((config: { run: () => Promise<unknown> }) => {
      return { ...config, _run: config.run };
    }),
  },
  task: vi.fn((config: { run: () => Promise<unknown> }) => {
    return { ...config, _run: config.run };
  }),
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

import { createAdminClient } from "@/lib/supabase/admin";
import { generateUserDrafts } from "@/trigger/generate-user-drafts";
import {
  outreachDispatcher,
  // Reuses getHourInTimezone from meeting-dispatcher via re-export or direct import
} from "@/trigger/outreach-dispatcher";
import { getHourInTimezone } from "@/trigger/meeting-dispatcher";

describe("Outreach Dispatcher", () => {
  const mockNot = vi.fn();
  const mockSelect = vi.fn().mockReturnValue({ not: mockNot });
  const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });

  const mockSupabase = { from: mockFrom };

  beforeEach(() => {
    vi.clearAllMocks();
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(
      mockSupabase
    );
  });

  // Access the run function from the mocked schedules.task
  const runDispatcher = async () => {
    return (
      outreachDispatcher as unknown as { _run: () => Promise<unknown> }
    )._run();
  };

  it("Test 1: queries users with zai_api_key_encrypted not null", async () => {
    mockNot.mockResolvedValue({ data: [], error: null });

    await runDispatcher();

    expect(mockFrom).toHaveBeenCalledWith("user_settings");
    expect(mockSelect).toHaveBeenCalledWith(
      "user_id, processing_schedule, zai_api_key_encrypted"
    );
    expect(mockNot).toHaveBeenCalledWith(
      "zai_api_key_encrypted",
      "is",
      null
    );
  });

  it("Test 2: checks timezone window using getHourInTimezone", async () => {
    const now = new Date();
    const currentHour = getHourInTimezone(now, "UTC");

    // Set a window that includes the current hour as start_hour
    mockNot.mockResolvedValue({
      data: [
        {
          user_id: "user-tz-test",
          processing_schedule: {
            interval_hours: 1,
            start_hour: currentHour,
            end_hour: (currentHour + 12) % 24,
            timezone: "UTC",
          },
          zai_api_key_encrypted: "encrypted_key",
        },
      ],
      error: null,
    });

    const result = await runDispatcher();

    // Should dispatch since current hour matches start_hour
    expect(generateUserDrafts.trigger).toHaveBeenCalled();
    expect(result).toEqual(
      expect.objectContaining({ dispatched: 1, skipped: 0 })
    );
  });

  it("Test 3: triggers only at start_hour of user's processing window", async () => {
    const now = new Date();
    const currentHour = getHourInTimezone(now, "UTC");

    // Start hour IS the current hour -- should dispatch
    mockNot.mockResolvedValue({
      data: [
        {
          user_id: "user-start-hour",
          processing_schedule: {
            interval_hours: 1,
            start_hour: currentHour,
            end_hour: (currentHour + 12) % 24,
            timezone: "UTC",
          },
          zai_api_key_encrypted: "encrypted_key",
        },
      ],
      error: null,
    });

    const result = await runDispatcher();

    expect(generateUserDrafts.trigger).toHaveBeenCalledWith(
      { userId: "user-start-hour" },
      expect.objectContaining({
        queue: expect.objectContaining({
          name: "user-user-start-hour-outreach",
          concurrencyLimit: 1,
        }),
      })
    );
    expect(result).toEqual(
      expect.objectContaining({ dispatched: 1 })
    );
  });

  it("Test 4: triggers generateUserDrafts with userId and queue concurrencyLimit 1", async () => {
    const now = new Date();
    const currentHour = getHourInTimezone(now, "UTC");

    mockNot.mockResolvedValue({
      data: [
        {
          user_id: "user-queue-test",
          processing_schedule: {
            interval_hours: 1,
            start_hour: currentHour,
            end_hour: (currentHour + 12) % 24,
            timezone: "UTC",
          },
          zai_api_key_encrypted: "encrypted_key",
        },
      ],
      error: null,
    });

    await runDispatcher();

    expect(generateUserDrafts.trigger).toHaveBeenCalledWith(
      { userId: "user-queue-test" },
      {
        queue: {
          name: "user-user-queue-test-outreach",
          concurrencyLimit: 1,
        },
      }
    );
  });

  it("Test 5: skips users outside their processing window (hour !== start_hour)", async () => {
    const now = new Date();
    const currentHour = getHourInTimezone(now, "UTC");

    // Start hour is NOT the current hour
    const differentStartHour = (currentHour + 6) % 24;

    mockNot.mockResolvedValue({
      data: [
        {
          user_id: "user-outside",
          processing_schedule: {
            interval_hours: 1,
            start_hour: differentStartHour,
            end_hour: (differentStartHour + 12) % 24,
            timezone: "UTC",
          },
          zai_api_key_encrypted: "encrypted_key",
        },
      ],
      error: null,
    });

    const result = await runDispatcher();

    expect(generateUserDrafts.trigger).not.toHaveBeenCalled();
    expect(result).toEqual(
      expect.objectContaining({ dispatched: 0, skipped: 1 })
    );
  });

  it("Test 6: returns { dispatched, skipped } counts", async () => {
    const now = new Date();
    const currentHour = getHourInTimezone(now, "UTC");
    const differentStartHour = (currentHour + 6) % 24;

    mockNot.mockResolvedValue({
      data: [
        {
          user_id: "user-in-window",
          processing_schedule: {
            interval_hours: 1,
            start_hour: currentHour,
            end_hour: (currentHour + 12) % 24,
            timezone: "UTC",
          },
          zai_api_key_encrypted: "encrypted_key_1",
        },
        {
          user_id: "user-out-window",
          processing_schedule: {
            interval_hours: 1,
            start_hour: differentStartHour,
            end_hour: (differentStartHour + 12) % 24,
            timezone: "UTC",
          },
          zai_api_key_encrypted: "encrypted_key_2",
        },
      ],
      error: null,
    });

    const result = await runDispatcher();

    expect(result).toEqual({ dispatched: 1, skipped: 1 });
  });
});
