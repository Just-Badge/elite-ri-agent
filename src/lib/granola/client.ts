import { createAdminClient } from "@/lib/supabase/admin";
import { encrypt, decrypt } from "@/lib/crypto/encryption";
import type {
  GranolaTokens,
  GranolaDocumentsResponse,
  GranolaTranscriptSegment,
} from "@/lib/granola/types";

const GRANOLA_BASE = "https://api.granola.ai";
const WORKOS_AUTH = "https://api.workos.com/user_management/authenticate";
const TOKEN_BUFFER_MS = 5 * 60 * 1000; // 5 minutes before expiry, refresh proactively

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
  await supabase
    .from("user_settings")
    .update({
      granola_refresh_token_encrypted: encrypt(data.refresh_token),
      granola_token_expiry: new Date(expiresAt).toISOString(),
      granola_token_status: "active",
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: expiresAt,
  };
}

/**
 * Get a fresh access token for Granola API calls.
 *
 * v1 implementation: Always refreshes because we only store refresh tokens,
 * not access tokens. Each task run gets a fresh access token. Since access
 * tokens are valid for 1 hour and tasks run infrequently, this is acceptable.
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

/**
 * Fetch documents (meetings) from Granola API.
 */
export async function getGranolaDocuments(
  accessToken: string,
  limit = 100,
  offset = 0
): Promise<GranolaDocumentsResponse> {
  const res = await fetch(`${GRANOLA_BASE}/v2/get-documents`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      limit,
      offset,
      include_last_viewed_panel: true,
    }),
  });

  if (!res.ok) {
    throw new Error(`Granola get-documents failed: ${res.status}`);
  }

  return res.json();
}

/**
 * Fetch transcript segments for a specific Granola document.
 */
export async function getGranolaTranscript(
  accessToken: string,
  documentId: string
): Promise<GranolaTranscriptSegment[]> {
  const res = await fetch(`${GRANOLA_BASE}/v1/get-document-transcript`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ document_id: documentId }),
  });

  if (!res.ok) {
    throw new Error(`Granola get-transcript failed: ${res.status}`);
  }

  return res.json();
}
