/**
 * Granola Token Management
 *
 * Handles OAuth token refresh via WorkOS. Access tokens are used to
 * authenticate MCP connections to mcp.granola.ai.
 *
 * NOTE: The Granola REST API (api.granola.ai) is enterprise-only.
 * All data access goes through the MCP adapter in mcp-adapter.ts.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { encrypt, decrypt } from "@/lib/crypto/encryption";
import type { GranolaTokens } from "@/lib/granola/types";

const WORKOS_AUTH = "https://api.workos.com/user_management/authenticate";

/**
 * Refresh the Granola access token via WorkOS OAuth token rotation.
 *
 * CRITICAL: Each refresh token is single-use. The old token is invalidated
 * the moment WorkOS returns a new one. The new refresh token MUST be
 * persisted to the database BEFORE this function returns.
 */
export async function refreshGranolaToken(
  userId: string,
  currentRefreshToken: string,
  clientId: string
): Promise<GranolaTokens> {
  const res = await fetch(WORKOS_AUTH, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      grant_type: "refresh_token",
      refresh_token: currentRefreshToken,
    }),
  });

  if (!res.ok) {
    throw new Error(`WorkOS token refresh failed: ${res.status}`);
  }

  const data = await res.json();

  const expiresAt = Date.now() + data.expires_in * 1000;

  // CRITICAL: Persist the new refresh token immediately.
  // The old one is now INVALID -- if we lose this new token, the
  // user must re-authenticate from the Granola desktop app.
  const supabase = createAdminClient();
  const { error: updateError } = await supabase
    .from("user_settings")
    .update({
      granola_refresh_token_encrypted: encrypt(data.refresh_token),
      granola_token_expiry: new Date(expiresAt).toISOString(),
      granola_token_status: "active",
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (updateError) {
    console.error(
      `CRITICAL: Failed to persist new Granola refresh token for user ${userId}. ` +
      `Token rotation succeeded at WorkOS but DB update failed: ${updateError.message}. ` +
      `User will need to re-authenticate via Granola.`
    );
    throw new Error(`Failed to persist rotated refresh token: ${updateError.message}`);
  }

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: expiresAt,
  };
}

/**
 * Get a fresh access token for Granola MCP connections.
 *
 * Always refreshes because we only store refresh tokens, not access tokens.
 * Each task run gets a fresh access token. Since access tokens are valid
 * for 1 hour and tasks run infrequently, this is acceptable.
 */
export async function getOrRefreshAccessToken(
  userId: string
): Promise<string> {
  const supabase = createAdminClient();

  const { data: settings, error } = await supabase
    .from("user_settings")
    .select(
      "granola_refresh_token_encrypted, granola_client_id, granola_token_expiry"
    )
    .eq("user_id", userId)
    .single();

  if (error || !settings) {
    throw new Error(`Failed to read user settings: ${error?.message ?? "no data"}`);
  }

  if (!settings.granola_refresh_token_encrypted) {
    throw new Error("No Granola refresh token found. User must connect Granola first.");
  }

  if (!settings.granola_client_id) {
    throw new Error("No Granola client ID found. User must connect Granola first.");
  }

  const currentRefreshToken = decrypt(settings.granola_refresh_token_encrypted);

  const tokens = await refreshGranolaToken(
    userId,
    currentRefreshToken,
    settings.granola_client_id
  );

  return tokens.access_token;
}
