/**
 * Meeting Processing Dispatcher (BullMQ)
 *
 * Scheduled cron job that runs hourly and fans out to per-user
 * meeting processing jobs. Checks each user's processing_schedule
 * to determine if the current hour falls within their configured window
 * and respects the interval_hours setting.
 */

import { Job } from "bullmq";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMeetingQueue } from "@/lib/queue/queues";
import {
  getHourInTimezone,
  shouldProcessAtHour,
  type ProcessingSchedule,
} from "./schedule-utils";

export async function processMeetingDispatcher(_job: Job): Promise<{
  dispatched: number;
  skipped: number;
}> {
  const supabase = createAdminClient();

  const { data: users, error } = await supabase
    .from("user_settings")
    .select("user_id, processing_schedule, granola_refresh_token_encrypted")
    .not("granola_refresh_token_encrypted", "is", null);

  if (error) {
    console.error("Failed to fetch users for dispatcher", error.message);
    throw new Error(`Dispatcher DB error: ${error.message}`);
  }

  if (!users || users.length === 0) {
    console.log("No users with Granola tokens found");
    return { dispatched: 0, skipped: 0 };
  }

  let dispatched = 0;
  let skipped = 0;
  const now = new Date();

  for (const user of users) {
    const schedule = user.processing_schedule as ProcessingSchedule | null;

    const effectiveSchedule: ProcessingSchedule = schedule ?? {
      interval_hours: 1,
      start_hour: 8,
      end_hour: 20,
      timezone: "UTC",
    };

    const userHour = getHourInTimezone(now, effectiveSchedule.timezone);

    const shouldProcess = shouldProcessAtHour(
      userHour,
      effectiveSchedule.start_hour,
      effectiveSchedule.end_hour,
      effectiveSchedule.interval_hours
    );

    if (!shouldProcess) {
      console.log(
        `User ${user.user_id} skipped (hour=${userHour}, window=${effectiveSchedule.start_hour}-${effectiveSchedule.end_hour}, interval=${effectiveSchedule.interval_hours}h)`
      );
      skipped++;
      continue;
    }

    console.log(
      `Dispatching meeting sync for user ${user.user_id} (hour=${userHour}, tz=${effectiveSchedule.timezone})`
    );

    await getMeetingQueue().add(
      "sync-granola-meetings",
      { userId: user.user_id },
      {
        jobId: `sync-${user.user_id}-${Date.now()}`,
      }
    );

    dispatched++;
  }

  console.log(`Dispatcher complete: dispatched=${dispatched}, skipped=${skipped}`);
  return { dispatched, skipped };
}
