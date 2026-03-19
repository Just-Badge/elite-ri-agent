import { gmail_v1, auth } from "@googleapis/gmail";
import { decrypt, encrypt } from "@/lib/crypto/encryption";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildMimeMessage } from "./mime";

export async function getGmailClient(userId: string): Promise<gmail_v1.Gmail> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("oauth_tokens")
    .select(
      "google_access_token_encrypted, google_refresh_token_encrypted, token_expiry, token_status"
    )
    .eq("user_id", userId)
    .single();

  if (error || !data?.google_refresh_token_encrypted) {
    throw new Error(
      `No OAuth token found for user ${userId}. Please reconnect your Google account.`
    );
  }

  const refreshToken = decrypt(data.google_refresh_token_encrypted);

  const oauth2Client = new auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  oauth2Client.setCredentials({
    refresh_token: refreshToken,
  });

  // Persist refreshed tokens back to the database
  oauth2Client.on("tokens", async (tokens) => {
    const adminClient = createAdminClient();
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (tokens.access_token) {
      updateData.google_access_token_encrypted = encrypt(tokens.access_token);
    }
    if (tokens.refresh_token) {
      updateData.google_refresh_token_encrypted = encrypt(tokens.refresh_token);
    }
    if (tokens.expiry_date) {
      updateData.token_expiry = new Date(tokens.expiry_date).toISOString();
    }

    await adminClient.from("oauth_tokens").update(updateData).eq("user_id", userId);
  });

  return new gmail_v1.Gmail({ auth: oauth2Client });
}

export async function createGmailDraft(
  userId: string,
  to: string,
  subject: string,
  htmlBody: string
): Promise<string> {
  const gmail = await getGmailClient(userId);
  const raw = buildMimeMessage(to, subject, htmlBody);

  const response = await gmail.users.drafts.create({
    userId: "me",
    requestBody: {
      message: { raw },
    },
  });

  return response.data.id!;
}

export async function sendGmailDraft(
  userId: string,
  gmailDraftId: string
): Promise<void> {
  const gmail = await getGmailClient(userId);

  await gmail.users.drafts.send({
    userId: "me",
    requestBody: { id: gmailDraftId },
  });
}

export async function deleteGmailDraft(
  userId: string,
  gmailDraftId: string
): Promise<void> {
  const gmail = await getGmailClient(userId);

  await gmail.users.drafts.delete({
    userId: "me",
    id: gmailDraftId,
  });
}
