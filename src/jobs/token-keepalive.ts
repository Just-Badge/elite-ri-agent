/**
 * Granola Token Keepalive Job (BullMQ)
 *
 * Runs every 6 hours to proactively refresh Granola OAuth tokens
 * for all connected users. This prevents token expiry during periods
 * when no meeting sync is scheduled (e.g., weekends, outside processing window).
 *
 * WorkOS refresh tokens are single-use and have an absolute lifetime.
 * By refreshing regularly, we keep the token rotation chain alive.
 */

import { Job } from "bullmq";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrRefreshAccessToken } from "@/lib/granola/client";

export async function processTokenKeepalive(_job: Job): Promise<{
  refreshed: number;
  failed: number;
  skipped: number;
}> {
  const supabase = createAdminClient();

  const { data: users, error } = await supabase
    .from("user_settings")
    .select("user_id, granola_refresh_token_encrypted, granola_token_status")
    .not("granola_refresh_token_encrypted", "is", null);

  if (error) {
    console.error("[keepalive] Failed to fetch users", error.message);
    throw new Error(`Token keepalive DB error: ${error.message}`);
  }

  if (!users || users.length === 0) {
    console.log("[keepalive] No users with Granola tokens");
    return { refreshed: 0, failed: 0, skipped: 0 };
  }

  let refreshed = 0;
  let failed = 0;
  let skipped = 0;

  for (const user of users) {
    // Skip users whose tokens are already marked as disconnected
    if (user.granola_token_status === "disconnected") {
      console.log(`[keepalive] Skipping disconnected user ${user.user_id}`);
      skipped++;
      continue;
    }

    try {
      // getOrRefreshAccessToken handles the full refresh cycle:
      // decrypt refresh token → call WorkOS → persist new tokens
      await getOrRefreshAccessToken(user.user_id);
      refreshed++;
      console.log(`[keepalive] Refreshed token for user ${user.user_id}`);
    } catch (err) {
      failed++;
      console.error(
        `[keepalive] Failed to refresh token for user ${user.user_id}:`,
        err instanceof Error ? err.message : String(err)
      );

      // Mark the token as expired so the UI can show reconnection prompt
      await supabase
        .from("user_settings")
        .update({
          granola_token_status: "expired",
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.user_id);
    }
  }

  console.log(
    `[keepalive] Complete: refreshed=${refreshed}, failed=${failed}, skipped=${skipped}`
  );

  return { refreshed, failed, skipped };
}
