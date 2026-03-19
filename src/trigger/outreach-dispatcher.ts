/**
 * Outreach Draft Dispatcher
 *
 * Scheduled cron task that runs hourly and fans out to per-user
 * outreach draft generation tasks. For each user with a z.ai API key,
 * checks if the current hour matches their processing window start_hour
 * (drafts are generated once per day at window start).
 */

import { schedules, logger } from "@trigger.dev/sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateUserDrafts } from "./generate-user-drafts";
import {
  getHourInTimezone,
  type ProcessingSchedule,
} from "./meeting-dispatcher";

export const outreachDispatcher = schedules.task({
  id: "outreach-draft-dispatcher",
  cron: "0 */1 * * *",
  run: async () => {
    const supabase = createAdminClient();

    const { data: users, error } = await supabase
      .from("user_settings")
      .select("user_id, processing_schedule, zai_api_key_encrypted")
      .not("zai_api_key_encrypted", "is", null);

    if (error) {
      logger.error("Failed to fetch users for outreach dispatcher", {
        error: error.message,
      });
      return { dispatched: 0, skipped: 0, error: error.message };
    }

    if (!users || users.length === 0) {
      logger.info("No users with z.ai API keys found");
      return { dispatched: 0, skipped: 0 };
    }

    let dispatched = 0;
    let skipped = 0;
    const now = new Date();

    for (const user of users) {
      const schedule = user.processing_schedule as ProcessingSchedule | null;

      // Default schedule if none configured: 8am-8pm UTC
      const effectiveSchedule: ProcessingSchedule = schedule ?? {
        interval_hours: 1,
        start_hour: 8,
        end_hour: 20,
        timezone: "UTC",
      };

      const userHour = getHourInTimezone(now, effectiveSchedule.timezone);

      // Only generate drafts once per day at the start of the window
      if (userHour !== effectiveSchedule.start_hour) {
        logger.info("User not at outreach window start", {
          userId: user.user_id,
          userHour,
          startHour: effectiveSchedule.start_hour,
          timezone: effectiveSchedule.timezone,
        });
        skipped++;
        continue;
      }

      logger.info("Dispatching outreach draft generation for user", {
        userId: user.user_id,
        userHour,
        timezone: effectiveSchedule.timezone,
      });

      await generateUserDrafts.trigger(
        { userId: user.user_id },
        {
          queue: {
            name: `user-${user.user_id}-outreach`,
            concurrencyLimit: 1,
          },
        }
      );

      dispatched++;
    }

    logger.info("Outreach dispatcher complete", { dispatched, skipped });
    return { dispatched, skipped };
  },
});
