import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

// Mock the sync-granola-meetings module
vi.mock("@/trigger/sync-granola-meetings", () => ({
  syncGranolaMeetings: {
    trigger: vi.fn().mockResolvedValue({ id: "run-123" }),
  },
}));

// Mock @trigger.dev/sdk
vi.mock("@trigger.dev/sdk", () => ({
  schedules: {
    task: vi.fn((config: { run: () => Promise<unknown> }) => {
      // Store the run function so we can invoke it in tests
      return { ...config, _run: config.run };
    }),
  },
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

import { createAdminClient } from "@/lib/supabase/admin";
import { syncGranolaMeetings } from "@/trigger/sync-granola-meetings";
import { meetingDispatcher, getHourInTimezone } from "@/trigger/meeting-dispatcher";

describe("Meeting Dispatcher", () => {
  const mockNot = vi.fn();
  const mockSelect = vi.fn().mockReturnValue({ not: mockNot });
  const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });

  const mockSupabase = { from: mockFrom };

  beforeEach(() => {
    vi.clearAllMocks();
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase);
  });

  describe("getHourInTimezone", () => {
    it("returns correct hour for UTC", () => {
      const date = new Date("2026-03-19T14:30:00Z");
      expect(getHourInTimezone(date, "UTC")).toBe(14);
    });

    it("returns correct hour for non-UTC timezone", () => {
      const date = new Date("2026-03-19T14:30:00Z");
      // EST is UTC-4 in March (EDT)
      const hour = getHourInTimezone(date, "America/New_York");
      expect(hour).toBe(10); // 14 UTC = 10 EDT
    });
  });

  describe("dispatcher run", () => {
    // Access the run function from the mocked schedules.task
    const runDispatcher = async () => {
      // The meetingDispatcher has the run function stored by our mock
      return (meetingDispatcher as unknown as { _run: () => Promise<unknown> })._run();
    };

    it("queries user_settings for users with Granola tokens", async () => {
      mockNot.mockResolvedValue({ data: [], error: null });

      await runDispatcher();

      expect(mockFrom).toHaveBeenCalledWith("user_settings");
      expect(mockSelect).toHaveBeenCalledWith(
        "user_id, processing_schedule, granola_refresh_token_encrypted"
      );
      expect(mockNot).toHaveBeenCalledWith(
        "granola_refresh_token_encrypted",
        "is",
        null
      );
    });

    it("skips users outside their processing window", async () => {
      // User with window 8-12 UTC
      const now = new Date();
      const currentHour = getHourInTimezone(now, "UTC");

      // Set a window that excludes the current hour
      const startHour = (currentHour + 4) % 24;
      const endHour = (currentHour + 8) % 24;

      mockNot.mockResolvedValue({
        data: [
          {
            user_id: "user-outside",
            processing_schedule: {
              interval_hours: 1,
              start_hour: startHour,
              end_hour: endHour,
              timezone: "UTC",
            },
            granola_refresh_token_encrypted: "encrypted_token",
          },
        ],
        error: null,
      });

      const result = await runDispatcher();

      expect(syncGranolaMeetings.trigger).not.toHaveBeenCalled();
      expect(result).toEqual(
        expect.objectContaining({ dispatched: 0, skipped: 1 })
      );
    });

    it("triggers syncGranolaMeetings for users within their window", async () => {
      const now = new Date();
      const currentHour = getHourInTimezone(now, "UTC");

      // Set a window that includes the current hour
      const startHour = currentHour;
      const endHour = currentHour + 1;

      mockNot.mockResolvedValue({
        data: [
          {
            user_id: "user-inside",
            processing_schedule: {
              interval_hours: 1,
              start_hour: startHour,
              end_hour: endHour,
              timezone: "UTC",
            },
            granola_refresh_token_encrypted: "encrypted_token",
          },
        ],
        error: null,
      });

      const result = await runDispatcher();

      expect(syncGranolaMeetings.trigger).toHaveBeenCalledWith(
        { userId: "user-inside" },
        {
          queue: "user-meetings",
          concurrencyKey: "user-inside",
        }
      );
      expect(result).toEqual(
        expect.objectContaining({ dispatched: 1, skipped: 0 })
      );
    });

    it("uses default schedule when user has no processing_schedule", async () => {
      // Default is 8-20 UTC
      const now = new Date();
      const currentHour = getHourInTimezone(now, "UTC");

      mockNot.mockResolvedValue({
        data: [
          {
            user_id: "user-no-schedule",
            processing_schedule: null,
            granola_refresh_token_encrypted: "encrypted_token",
          },
        ],
        error: null,
      });

      const result = await runDispatcher();

      // If current UTC hour is within 8-20, should dispatch; otherwise skip
      if (currentHour >= 8 && currentHour < 20) {
        expect(syncGranolaMeetings.trigger).toHaveBeenCalledWith(
          { userId: "user-no-schedule" },
          expect.objectContaining({
            queue: "user-meetings",
            concurrencyKey: "user-no-schedule",
          })
        );
        expect(result).toEqual(
          expect.objectContaining({ dispatched: 1, skipped: 0 })
        );
      } else {
        expect(syncGranolaMeetings.trigger).not.toHaveBeenCalled();
        expect(result).toEqual(
          expect.objectContaining({ dispatched: 0, skipped: 1 })
        );
      }
    });

    it("handles database errors gracefully", async () => {
      mockNot.mockResolvedValue({
        data: null,
        error: { message: "Database connection failed" },
      });

      const result = await runDispatcher();

      expect(result).toEqual(
        expect.objectContaining({ dispatched: 0, skipped: 0, error: "Database connection failed" })
      );
      expect(syncGranolaMeetings.trigger).not.toHaveBeenCalled();
    });
  });
});
