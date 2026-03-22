/**
 * Outreach Draft Dispatcher (BullMQ)
 *
 * Scheduled cron job that runs hourly and fans out to per-user
 * outreach draft generation jobs. For each user with a z.ai API key,
 * checks if the current hour matches their processing window start_hour
 * (drafts are generated once per day at window start).
 */

import { Job } from "bullmq";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOutreachQueue } from "@/lib/queue/queues";
import {
  getHourInTimezone,
  type ProcessingSchedule,
} from "./schedule-utils";

export async function processOutreachDispatcher(_job: Job): Promise<{
  dispatched: number;
  skipped: number;
}> {
  const supabase = createAdminClient();

  const { data: users, error } = await supabase
    .from("user_settings")
    .select("user_id, processing_schedule, zai_api_key_encrypted")
    .not("zai_api_key_encrypted", "is", null);

  if (error) {
    console.error("Failed to fetch users for outreach dispatcher", error.message);
    throw new Error(`Outreach dispatcher DB error: ${error.message}`);
  }

  if (!users || users.length === 0) {
    console.log("No users with z.ai API keys found");
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

    // Only generate drafts once per day at the start of the window
    if (userHour !== effectiveSchedule.start_hour) {
      console.log(
        `User ${user.user_id} not at outreach window start (hour=${userHour}, startHour=${effectiveSchedule.start_hour})`
      );
      skipped++;
      continue;
    }

    console.log(
      `Dispatching outreach drafts for user ${user.user_id} (hour=${userHour}, tz=${effectiveSchedule.timezone})`
    );

    await getOutreachQueue().add(
      "generate-user-drafts",
      { userId: user.user_id },
      {
        jobId: `drafts-${user.user_id}-${Date.now()}`,
      }
    );

    dispatched++;
  }

  console.log(`Outreach dispatcher complete: dispatched=${dispatched}, skipped=${skipped}`);
  return { dispatched, skipped };
}
