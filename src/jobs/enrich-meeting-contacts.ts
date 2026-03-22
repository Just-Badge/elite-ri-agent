/**
 * Enrich Meeting Contacts Job (BullMQ)
 *
 * Slow, AI-powered job that runs per-meeting. Fetches the full transcript
 * from Granola MCP, runs AI extraction via z.ai GLM-5, and merges enriched
 * fields (role, background, relationship context, action items) into contacts.
 */

import { Job } from "bullmq";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrRefreshAccessToken } from "@/lib/granola/client";
import { GranolaMcpAdapter } from "@/lib/granola/mcp-adapter";
import { extractContactsFromTranscript } from "@/lib/ai/extract-contacts";
import { decrypt } from "@/lib/crypto/encryption";
import { upsertEnrichedContacts } from "@/lib/meetings/db";

interface EnrichPayload {
  userId: string;
  meetingId: string;
  granolaDocumentId: string;
}

export async function processEnrichMeetingContacts(
  job: Job<EnrichPayload>
): Promise<{
  enriched: boolean;
  reason?: string;
  contactsCreated?: number;
  contactsUpdated?: number;
}> {
  const { userId, meetingId, granolaDocumentId } = job.data;
  const supabase = createAdminClient();

  // 1. Get user's z.ai API key
  const { data: settings } = await supabase
    .from("user_settings")
    .select("zai_api_key_encrypted")
    .eq("user_id", userId)
    .single();

  if (!settings?.zai_api_key_encrypted) {
    console.warn(`[enrich] No z.ai API key for user ${userId} — skipping`);
    return { enriched: false, reason: "no_api_key" };
  }

  const apiKey = decrypt(settings.zai_api_key_encrypted);

  // 2. Get meeting title
  const { data: meeting } = await supabase
    .from("meetings")
    .select("title")
    .eq("id", meetingId)
    .single();

  const meetingTitle = meeting?.title || "Untitled Meeting";

  await job.updateProgress({
    phase: "enrichment",
    meeting: meetingTitle,
    status: "fetching_transcript",
  });

  // 3. Fetch transcript from Granola MCP
  const accessToken = await getOrRefreshAccessToken(userId);
  const adapter = new GranolaMcpAdapter(accessToken);

  let transcript: string;
  try {
    transcript = await adapter.getTranscript(granolaDocumentId);
  } finally {
    await adapter.close();
  }

  if (!transcript.trim()) {
    console.log(`[enrich] Empty transcript for meeting ${meetingId}, skipping`);
    return { enriched: false, reason: "empty_transcript" };
  }

  // Store transcript
  await supabase
    .from("meetings")
    .update({
      transcript,
      processed_at: new Date().toISOString(),
    })
    .eq("id", meetingId);

  await job.updateProgress({
    phase: "enrichment",
    meeting: meetingTitle,
    status: "extracting_contacts",
  });

  // 4. Get existing contacts for dedup context
  const { data: contacts } = await supabase
    .from("contacts")
    .select("id, name, email")
    .eq("user_id", userId);

  const existingContacts = (contacts || []).map((c) => ({
    id: c.id,
    name: c.name,
    email: c.email,
  }));

  // 5. Run AI extraction
  const extraction = await extractContactsFromTranscript(
    apiKey,
    transcript,
    meetingTitle,
    existingContacts.map((c) => ({ name: c.name, email: c.email ?? undefined }))
  );

  // 6. Update meeting summary
  if (extraction.meeting_summary) {
    await supabase
      .from("meetings")
      .update({ summary: extraction.meeting_summary })
      .eq("id", meetingId);
  }

  // 7. Upsert enriched contacts
  const result = await upsertEnrichedContacts(
    supabase,
    userId,
    meetingId,
    extraction.contacts,
    existingContacts
  );

  await job.updateProgress({
    phase: "enrichment",
    meeting: meetingTitle,
    status: "complete",
    contactsEnriched: result.updated,
    contactsCreated: result.created,
  });

  console.log(
    `[enrich] Complete for meeting ${meetingId}: created=${result.created}, updated=${result.updated}`
  );

  return {
    enriched: true,
    contactsCreated: result.created,
    contactsUpdated: result.updated,
  };
}
