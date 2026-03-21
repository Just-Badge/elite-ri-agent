/**
 * Meeting Processing Dispatcher
 *
 * Scheduled cron task that runs hourly and fans out to per-user
 * meeting processing tasks. Checks each user's processing_schedule
 * to determine if the current hour falls within their configured window.
 */

import { schedules, logger } from "@trigger.dev/sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncGranolaMeetings } from "./sync-granola-meetings";

/**
 * Get the current hour (0-23) in a given IANA timezone.
 * Uses Intl.DateTimeFormat to reliably handle DST and timezone offsets.
 */
export function getHourInTimezone(date: Date, timezone: string): number {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "numeric",
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const hourPart = parts.find((p) => p.type === "hour");
  return parseInt(hourPart?.value ?? "0", 10);
}

export interface ProcessingSchedule {
  interval_hours: number;
  start_hour: number;
  end_hour: number;
  timezone: string;
}

export const meetingDispatcher = schedules.task({
  id: "meeting-processing-dispatcher",
  cron: "0 */1 * * *",
  run: async () => {
    const supabase = createAdminClient();

    const { data: users, error } = await supabase
      .from("user_settings")
      .select("user_id, processing_schedule, granola_refresh_token_encrypted")
      .not("granola_refresh_token_encrypted", "is", null);

    if (error) {
      logger.error("Failed to fetch users for dispatcher", { error: error.message });
      return { dispatched: 0, skipped: 0, error: error.message };
    }

    if (!users || users.length === 0) {
      logger.info("No users with Granola tokens found");
      return { dispatched: 0, skipped: 0 };
    }

    let dispatched = 0;
    let skipped = 0;
    const now = new Date();

    for (const user of users) {
      const schedule = user.processing_schedule as ProcessingSchedule | null;

      // Default schedule if none configured: 8am-8pm UTC, every hour
      const effectiveSchedule: ProcessingSchedule = schedule ?? {
        interval_hours: 1,
        start_hour: 8,
        end_hour: 20,
        timezone: "UTC",
      };

      const userHour = getHourInTimezone(now, effectiveSchedule.timezone);

      if (userHour < effectiveSchedule.start_hour || userHour >= effectiveSchedule.end_hour) {
        logger.info("User outside processing window", {
          userId: user.user_id,
          userHour,
          window: `${effectiveSchedule.start_hour}-${effectiveSchedule.end_hour}`,
          timezone: effectiveSchedule.timezone,
        });
        skipped++;
        continue;
      }

      logger.info("Dispatching meeting processing for user", {
        userId: user.user_id,
        userHour,
        timezone: effectiveSchedule.timezone,
      });

      await syncGranolaMeetings.trigger(
        { userId: user.user_id },
        {
          queue: "user-meetings",
          concurrencyKey: user.user_id,
        }
      );

      dispatched++;
    }

    logger.info("Dispatcher complete", { dispatched, skipped });
    return { dispatched, skipped };
  },
});
