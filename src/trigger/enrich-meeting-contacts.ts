/**
 * Enrich Meeting Contacts Task
 *
 * Slow, AI-powered task that runs per-meeting. Fetches the full transcript
 * from Granola MCP, runs AI extraction via z.ai GLM-5, and merges enriched
 * fields (role, background, relationship context, action items) into contacts.
 */

import { task, logger, metadata } from "@trigger.dev/sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrRefreshAccessToken } from "@/lib/granola/client";
import { GranolaMcpAdapter } from "@/lib/granola/mcp-adapter";
import { extractContactsFromTranscript } from "@/lib/ai/extract-contacts";
import { decrypt } from "@/lib/crypto/encryption";
import { upsertEnrichedContacts } from "@/lib/meetings/db";

export const enrichMeetingContacts = task({
  id: "enrich-meeting-contacts",
  retry: {
    maxAttempts: 2,
    factor: 2,
    minTimeoutInMs: 5000,
    maxTimeoutInMs: 30000,
  },
  run: async (payload: {
    userId: string;
    meetingId: string;
    granolaDocumentId: string;
  }) => {
    const supabase = createAdminClient();

    // 1. Get user's z.ai API key
    const { data: settings } = await supabase
      .from("user_settings")
      .select("zai_api_key_encrypted")
      .eq("user_id", payload.userId)
      .single();

    if (!settings?.zai_api_key_encrypted) {
      logger.warn("No z.ai API key — skipping AI enrichment", { userId: payload.userId });
      return { enriched: false, reason: "no_api_key" };
    }

    const apiKey = decrypt(settings.zai_api_key_encrypted);

    // 2. Get meeting title
    const { data: meeting } = await supabase
      .from("meetings")
      .select("title")
      .eq("id", payload.meetingId)
      .single();

    const meetingTitle = meeting?.title || "Untitled Meeting";

    metadata.set("progress", {
      phase: "enrichment",
      meeting: meetingTitle,
      status: "fetching_transcript",
    });

    // 3. Fetch transcript from Granola MCP
    const accessToken = await getOrRefreshAccessToken(payload.userId);
    const adapter = new GranolaMcpAdapter(accessToken);

    let transcript: string;
    try {
      transcript = await adapter.getTranscript(payload.granolaDocumentId);
    } finally {
      await adapter.close();
    }

    if (!transcript.trim()) {
      logger.info("Empty transcript, skipping enrichment", { meetingId: payload.meetingId });
      return { enriched: false, reason: "empty_transcript" };
    }

    // Store transcript
    await supabase
      .from("meetings")
      .update({
        transcript,
        processed_at: new Date().toISOString(),
      })
      .eq("id", payload.meetingId);

    metadata.set("progress", {
      phase: "enrichment",
      meeting: meetingTitle,
      status: "extracting_contacts",
    });

    // 4. Get existing contacts for dedup context
    const { data: contacts } = await supabase
      .from("contacts")
      .select("id, name, email")
      .eq("user_id", payload.userId);

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
        .eq("id", payload.meetingId);
    }

    // 7. Upsert enriched contacts
    const result = await upsertEnrichedContacts(
      supabase,
      payload.userId,
      payload.meetingId,
      extraction.contacts,
      existingContacts
    );

    metadata.set("progress", {
      phase: "enrichment",
      meeting: meetingTitle,
      status: "complete",
      contactsEnriched: result.updated,
      contactsCreated: result.created,
    });

    logger.info("Enrichment complete", {
      meetingId: payload.meetingId,
      meetingTitle,
      ...result,
    });

    return {
      enriched: true,
      contactsCreated: result.created,
      contactsUpdated: result.updated,
    };
  },
});
