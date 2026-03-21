/**
 * Sync Granola Meetings Task
 *
 * Fast sync — no AI calls. Connects to Granola MCP server, fetches meetings
 * with participant data, creates basic contacts (name, email, company),
 * then triggers per-meeting enrichment tasks for AI processing.
 */

import { task, logger, metadata } from "@trigger.dev/sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrRefreshAccessToken } from "@/lib/granola/client";
import { GranolaMcpAdapter } from "@/lib/granola/mcp-adapter";
import { insertMeetingRecord, upsertBasicContact } from "@/lib/meetings/db";
import { enrichMeetingContacts } from "./enrich-meeting-contacts";

/** Emails belonging to the app owner — skip as contacts */
const OWNER_EMAILS = new Set([
  "matthews.lacrosse@gmail.com",
  "matthew@justbadge.com",
]);

export const syncGranolaMeetings = task({
  id: "sync-granola-meetings",
  retry: {
    maxAttempts: 3,
    factor: 1.8,
    minTimeoutInMs: 2000,
    maxTimeoutInMs: 30000,
  },
  run: async (payload: { userId: string }) => {
    const supabase = createAdminClient();

    // 1. Get access token and create MCP adapter
    const accessToken = await getOrRefreshAccessToken(payload.userId);
    const adapter = new GranolaMcpAdapter(accessToken);

    let meetingsSynced = 0;
    let contactsCreated = 0;
    let contactsUpdated = 0;

    try {
      // 2. Fetch all meetings from Granola via MCP
      logger.info("Fetching meetings from Granola MCP...");
      const meetings = await adapter.listMeetings();
      logger.info(`Found ${meetings.length} meetings from Granola`);

      // 3. Filter already-processed meetings
      const { data: existingMeetings } = await supabase
        .from("meetings")
        .select("granola_document_id")
        .eq("user_id", payload.userId)
        .not("granola_document_id", "is", null);

      const processedIds = new Set(
        (existingMeetings || []).map((m) => m.granola_document_id)
      );

      const newMeetings = meetings.filter((m) => !processedIds.has(m.id));

      if (newMeetings.length === 0) {
        logger.info("All meetings already synced");
        return { meetingsSynced: 0, contactsCreated: 0, contactsUpdated: 0, enrichmentTriggered: 0 };
      }

      logger.info(`${newMeetings.length} new meetings to sync`);

      metadata.set("progress", {
        phase: "sync",
        total: newMeetings.length,
        processed: 0,
      });

      // 4. Process each new meeting
      for (let i = 0; i < newMeetings.length; i++) {
        const meeting = newMeetings[i];

        try {
          // Insert meeting record
          const dbMeeting = await insertMeetingRecord(supabase, payload.userId, meeting);

          // Upsert participants as basic contacts
          const externalParticipants = meeting.participants.filter(
            (p) => !p.email || !OWNER_EMAILS.has(p.email.toLowerCase())
          );

          for (const participant of externalParticipants) {
            try {
              const { isNew } = await upsertBasicContact(
                supabase,
                payload.userId,
                participant
              );

              if (isNew) contactsCreated++;
              else contactsUpdated++;

              // Create contact_meetings junction
              const { data: contact } = await supabase
                .from("contacts")
                .select("id")
                .eq("user_id", payload.userId)
                .ilike("email", participant.email || "")
                .single();

              if (contact) {
                await supabase.from("contact_meetings").upsert(
                  {
                    user_id: payload.userId,
                    contact_id: contact.id,
                    meeting_id: dbMeeting.id,
                  },
                  { onConflict: "contact_id,meeting_id", ignoreDuplicates: true }
                );
              }
            } catch (err) {
              logger.error("Failed to upsert participant", {
                name: participant.name,
                error: err instanceof Error ? err.message : String(err),
              });
            }
          }

          meetingsSynced++;

          // Emit progress for realtime UI
          metadata.set("progress", {
            phase: "sync",
            total: newMeetings.length,
            processed: i + 1,
            latestMeeting: meeting.title,
            contactsCreated,
            contactsUpdated,
          });

          // Trigger enrichment task for this meeting
          await enrichMeetingContacts.trigger({
            userId: payload.userId,
            meetingId: dbMeeting.id,
            granolaDocumentId: meeting.id,
          });

        } catch (err) {
          logger.error("Failed to sync meeting", {
            meetingId: meeting.id,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }

    } finally {
      await adapter.close();
    }

    logger.info("Sync complete", { meetingsSynced, contactsCreated, contactsUpdated });

    metadata.set("progress", {
      phase: "complete",
      meetingsSynced,
      contactsCreated,
      contactsUpdated,
    });

    return {
      meetingsSynced,
      contactsCreated,
      contactsUpdated,
      enrichmentTriggered: meetingsSynced,
    };
  },
});
