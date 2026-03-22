/**
 * Sync Granola Meetings Job (BullMQ)
 *
 * Fast sync — no AI calls. Connects to Granola MCP server, fetches meetings
 * with participant data, creates basic contacts (name, email, company),
 * then enqueues per-meeting enrichment jobs for AI processing.
 */

import { Job } from "bullmq";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrRefreshAccessToken } from "@/lib/granola/client";
import { GranolaMcpAdapter } from "@/lib/granola/mcp-adapter";
import { insertMeetingRecord, upsertBasicContact } from "@/lib/meetings/db";
import { getMeetingQueue } from "@/lib/queue/queues";

/** Emails belonging to the app owner — skip as contacts */
const OWNER_EMAILS = new Set([
  "matthews.lacrosse@gmail.com",
  "matthew@justbadge.com",
]);

export async function processSyncGranolaMeetings(
  job: Job<{ userId: string }>
): Promise<{
  meetingsSynced: number;
  contactsCreated: number;
  contactsUpdated: number;
  enrichmentTriggered: number;
}> {
  const { userId } = job.data;
  const supabase = createAdminClient();

  // 1. Get access token and create MCP adapter
  const accessToken = await getOrRefreshAccessToken(userId);
  const adapter = new GranolaMcpAdapter(accessToken);

  let meetingsSynced = 0;
  let contactsCreated = 0;
  let contactsUpdated = 0;

  try {
    // 2. Fetch all meetings from Granola via MCP
    console.log(`[sync-meetings] Fetching meetings for user ${userId}...`);
    const meetings = await adapter.listMeetings();
    console.log(`[sync-meetings] Found ${meetings.length} meetings from Granola`);

    // 3. Filter already-processed meetings
    const { data: existingMeetings } = await supabase
      .from("meetings")
      .select("granola_document_id")
      .eq("user_id", userId)
      .not("granola_document_id", "is", null);

    const processedIds = new Set(
      (existingMeetings || []).map((m) => m.granola_document_id)
    );

    const newMeetings = meetings.filter((m) => !processedIds.has(m.id));

    if (newMeetings.length === 0) {
      console.log("[sync-meetings] All meetings already synced");
      return { meetingsSynced: 0, contactsCreated: 0, contactsUpdated: 0, enrichmentTriggered: 0 };
    }

    console.log(`[sync-meetings] ${newMeetings.length} new meetings to sync`);

    await job.updateProgress({
      phase: "sync",
      total: newMeetings.length,
      processed: 0,
    });

    // 4. Process each new meeting
    for (let i = 0; i < newMeetings.length; i++) {
      const meeting = newMeetings[i];

      try {
        const dbMeeting = await insertMeetingRecord(supabase, userId, meeting);

        // Upsert participants as basic contacts
        const externalParticipants = meeting.participants.filter(
          (p) => !p.email || !OWNER_EMAILS.has(p.email.toLowerCase())
        );

        for (const participant of externalParticipants) {
          try {
            const { isNew } = await upsertBasicContact(
              supabase,
              userId,
              participant
            );

            if (isNew) contactsCreated++;
            else contactsUpdated++;

            // Create contact_meetings junction
            const { data: contact } = await supabase
              .from("contacts")
              .select("id")
              .eq("user_id", userId)
              .ilike("email", participant.email || "")
              .single();

            if (contact) {
              await supabase.from("contact_meetings").upsert(
                {
                  user_id: userId,
                  contact_id: contact.id,
                  meeting_id: dbMeeting.id,
                },
                { onConflict: "contact_id,meeting_id", ignoreDuplicates: true }
              );
            }
          } catch (err) {
            console.error(
              `[sync-meetings] Failed to upsert participant ${participant.name}:`,
              err instanceof Error ? err.message : String(err)
            );
          }
        }

        meetingsSynced++;

        await job.updateProgress({
          phase: "sync",
          total: newMeetings.length,
          processed: i + 1,
          latestMeeting: meeting.title,
          contactsCreated,
          contactsUpdated,
        });

        // Enqueue enrichment job for this meeting
        await getMeetingQueue().add(
          "enrich-meeting-contacts",
          {
            userId,
            meetingId: dbMeeting.id,
            granolaDocumentId: meeting.id,
          },
          {
            jobId: `enrich-${dbMeeting.id}-${Date.now()}`,
            attempts: 2,
            backoff: { type: "exponential", delay: 5000 },
          }
        );
      } catch (err) {
        console.error(
          `[sync-meetings] Failed to sync meeting ${meeting.id}:`,
          err instanceof Error ? err.message : String(err)
        );
      }
    }
  } finally {
    await adapter.close();
  }

  console.log(
    `[sync-meetings] Complete: synced=${meetingsSynced}, created=${contactsCreated}, updated=${contactsUpdated}`
  );

  return {
    meetingsSynced,
    contactsCreated,
    contactsUpdated,
    enrichmentTriggered: meetingsSynced,
  };
}
