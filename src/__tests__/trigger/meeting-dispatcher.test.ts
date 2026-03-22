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
import { meetingDispatcher, getHourInTimezone, shouldProcessAtHour } from "@/trigger/meeting-dispatcher";

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

  describe("shouldProcessAtHour", () => {
    describe("normal window (does not cross midnight)", () => {
      it("returns true at interval boundaries (hourly)", () => {
        // Window 8-20, interval 1
        expect(shouldProcessAtHour(8, 8, 20, 1)).toBe(true);
        expect(shouldProcessAtHour(12, 8, 20, 1)).toBe(true);
        expect(shouldProcessAtHour(19, 8, 20, 1)).toBe(true);
      });

      it("returns false outside window", () => {
        expect(shouldProcessAtHour(7, 8, 20, 1)).toBe(false);
        expect(shouldProcessAtHour(20, 8, 20, 1)).toBe(false);
        expect(shouldProcessAtHour(23, 8, 20, 1)).toBe(false);
      });

      it("returns true at 2-hour intervals", () => {
        // Window 8-20, interval 2
        expect(shouldProcessAtHour(8, 8, 20, 2)).toBe(true);  // 0 hours since start
        expect(shouldProcessAtHour(10, 8, 20, 2)).toBe(true); // 2 hours since start
        expect(shouldProcessAtHour(12, 8, 20, 2)).toBe(true); // 4 hours since start
        expect(shouldProcessAtHour(14, 8, 20, 2)).toBe(true); // 6 hours since start
        expect(shouldProcessAtHour(18, 8, 20, 2)).toBe(true); // 10 hours since start
      });

      it("returns false between interval boundaries", () => {
        // Window 8-20, interval 2
        expect(shouldProcessAtHour(9, 8, 20, 2)).toBe(false);  // 1 hour since start
        expect(shouldProcessAtHour(11, 8, 20, 2)).toBe(false); // 3 hours since start
        expect(shouldProcessAtHour(13, 8, 20, 2)).toBe(false); // 5 hours since start
        expect(shouldProcessAtHour(15, 8, 20, 2)).toBe(false); // 7 hours since start
      });

      it("returns true at 4-hour intervals", () => {
        // Window 8-20, interval 4
        expect(shouldProcessAtHour(8, 8, 20, 4)).toBe(true);  // 0 hours since start
        expect(shouldProcessAtHour(12, 8, 20, 4)).toBe(true); // 4 hours since start
        expect(shouldProcessAtHour(16, 8, 20, 4)).toBe(true); // 8 hours since start
      });

      it("returns false at non-boundaries for 4-hour intervals", () => {
        // Window 8-20, interval 4
        expect(shouldProcessAtHour(9, 8, 20, 4)).toBe(false);
        expect(shouldProcessAtHour(10, 8, 20, 4)).toBe(false);
        expect(shouldProcessAtHour(11, 8, 20, 4)).toBe(false);
        expect(shouldProcessAtHour(14, 8, 20, 4)).toBe(false);
        expect(shouldProcessAtHour(15, 8, 20, 4)).toBe(false);
      });
    });

    describe("wraparound window (crosses midnight)", () => {
      it("returns true at interval boundaries in wraparound window", () => {
        // Window 22-6 (crosses midnight), interval 2
        expect(shouldProcessAtHour(22, 22, 6, 2)).toBe(true); // 0 hours since start
        expect(shouldProcessAtHour(0, 22, 6, 2)).toBe(true);  // 2 hours since start (24-22+0)
        expect(shouldProcessAtHour(2, 22, 6, 2)).toBe(true);  // 4 hours since start
        expect(shouldProcessAtHour(4, 22, 6, 2)).toBe(true);  // 6 hours since start
      });

      it("returns false between interval boundaries in wraparound window", () => {
        // Window 22-6, interval 2
        expect(shouldProcessAtHour(23, 22, 6, 2)).toBe(false); // 1 hour since start
        expect(shouldProcessAtHour(1, 22, 6, 2)).toBe(false);  // 3 hours since start
        expect(shouldProcessAtHour(3, 22, 6, 2)).toBe(false);  // 5 hours since start
        expect(shouldProcessAtHour(5, 22, 6, 2)).toBe(false);  // 7 hours since start
      });

      it("returns false outside wraparound window", () => {
        // Window 22-6
        expect(shouldProcessAtHour(6, 22, 6, 1)).toBe(false);  // end hour is exclusive
        expect(shouldProcessAtHour(7, 22, 6, 1)).toBe(false);
        expect(shouldProcessAtHour(12, 22, 6, 1)).toBe(false);
        expect(shouldProcessAtHour(21, 22, 6, 1)).toBe(false);
      });
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
