/**
 * Per-User Meeting Processing Task
 *
 * Fetches new Granola meetings for a single user, runs AI contact extraction
 * on each transcript, and upserts contacts with email-based deduplication.
 *
 * Called by the meeting-dispatcher for each user within their processing window,
 * or manually via the /api/meetings/process endpoint.
 */

import { task, logger } from "@trigger.dev/sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrRefreshAccessToken, getGranolaDocuments, getGranolaTranscript } from "@/lib/granola/client";
import { extractContactsFromTranscript } from "@/lib/ai/extract-contacts";
import { decrypt } from "@/lib/crypto/encryption";
import type { ExtractedContact } from "@/lib/ai/types";
import type { GranolaDocument } from "@/lib/granola/types";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Insert a meeting record from a Granola document.
 * Returns the inserted meeting row including the generated granola_url.
 */
export async function insertMeetingRecord(
  supabase: SupabaseClient,
  userId: string,
  doc: { id: string; title: string; created_at: string }
) {
  const granolaUrl = `https://app.granola.so/notes/${doc.id}`;

  const { data: meeting, error } = await supabase
    .from("meetings")
    .insert({
      user_id: userId,
      granola_document_id: doc.id,
      title: doc.title || null,
      meeting_date: doc.created_at || new Date().toISOString(),
      granola_url: granolaUrl,
      created_at: new Date().toISOString(),
    })
    .select("id, granola_url")
    .single();

  if (error) {
    throw new Error(`Failed to insert meeting: ${error.message}`);
  }

  return meeting;
}

/**
 * Upsert extracted contacts with email-based deduplication.
 *
 * Dedup rules:
 * - Email matches existing contact: UPDATE existing (merge new info into existing fields)
 * - Email is new (no match): INSERT new contact
 * - No email but name matches: UPDATE existing cautiously (only fill empty fields)
 * - No email and no name match: INSERT new contact with ai_confidence from extraction
 *
 * Also creates contact_meetings junction records and inserts action_items.
 */
export async function upsertExtractedContacts(
  supabase: SupabaseClient,
  userId: string,
  meetingId: string,
  extractedContacts: ExtractedContact[],
  existingContacts: { id: string; name: string; email: string | null }[]
): Promise<{ created: number; updated: number }> {
  let created = 0;
  let updated = 0;

  for (const extracted of extractedContacts) {
    let contactId: string | null = null;

    // Strategy 1: Match by email
    const emailMatch = extracted.email
      ? existingContacts.find(
          (c) => c.email && c.email.toLowerCase() === extracted.email!.toLowerCase()
        )
      : null;

    // Serialize relationship_context object to text for DB storage
    const relationshipText = extracted.relationship_context
      ? [
          extracted.relationship_context.why && `Why: ${extracted.relationship_context.why}`,
          extracted.relationship_context.what && `What: ${extracted.relationship_context.what}`,
          extracted.relationship_context.mutual_value && `Mutual Value: ${extracted.relationship_context.mutual_value}`,
        ].filter(Boolean).join("\n") || null
      : null;

    if (emailMatch) {
      // UPDATE existing contact -- merge non-null extracted fields
      const updateFields: Record<string, unknown> = {};
      if (extracted.company) updateFields.company = extracted.company;
      if (extracted.role) updateFields.role = extracted.role;
      if (extracted.location) updateFields.location = extracted.location;
      if (extracted.category) updateFields.category = extracted.category;
      if (extracted.background) updateFields.background = extracted.background;
      if (relationshipText) updateFields.relationship_context = relationshipText;
      if (extracted.notes) updateFields.notes = extracted.notes;
      updateFields.updated_at = new Date().toISOString();
      updateFields.last_interaction_at = new Date().toISOString();

      await supabase
        .from("contacts")
        .update(updateFields)
        .eq("id", emailMatch.id);

      contactId = emailMatch.id;
      updated++;
    } else if (!extracted.email) {
      // Strategy 2: No email -- try name match
      const nameMatch = existingContacts.find(
        (c) => c.name.toLowerCase() === extracted.name.toLowerCase()
      );

      if (nameMatch) {
        // Cautious update: only fill in fields that are empty on existing contact
        // We need to fetch the full contact to check what fields are null
        const { data: fullContact } = await supabase
          .from("contacts")
          .select("*")
          .eq("id", nameMatch.id)
          .single();

        if (fullContact) {
          const cautionUpdate: Record<string, unknown> = {};
          if (!fullContact.company && extracted.company) cautionUpdate.company = extracted.company;
          if (!fullContact.role && extracted.role) cautionUpdate.role = extracted.role;
          if (!fullContact.location && extracted.location) cautionUpdate.location = extracted.location;
          if (!fullContact.category && extracted.category) cautionUpdate.category = extracted.category;
          if (!fullContact.background && extracted.background) cautionUpdate.background = extracted.background;
          if (!fullContact.relationship_context && relationshipText) {
            cautionUpdate.relationship_context = relationshipText;
          }
          if (!fullContact.notes && extracted.notes) cautionUpdate.notes = extracted.notes;
          cautionUpdate.updated_at = new Date().toISOString();
          cautionUpdate.last_interaction_at = new Date().toISOString();

          if (Object.keys(cautionUpdate).length > 2) {
            // More than just timestamps
            await supabase
              .from("contacts")
              .update(cautionUpdate)
              .eq("id", nameMatch.id);
          }
        }

        contactId = nameMatch.id;
        updated++;
      } else {
        // No match at all -- insert new
        const { data: newContact, error: insertError } = await supabase
          .from("contacts")
          .insert({
            user_id: userId,
            name: extracted.name,
            email: extracted.email || null,
            company: extracted.company || null,
            role: extracted.role || null,
            location: extracted.location || null,
            category: extracted.category || null,
            background: extracted.background || null,
            relationship_context: relationshipText,
            notes: extracted.notes || null,
            status: "active",
            ai_confidence: extracted.confidence,
            last_interaction_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select("id")
          .single();

        if (insertError) {
          logger.error("Failed to insert contact", {
            name: extracted.name,
            error: insertError.message,
          });
          continue;
        }

        contactId = newContact.id;
        created++;
      }
    } else {
      // New email -- INSERT
      const { data: newContact, error: insertError } = await supabase
        .from("contacts")
        .insert({
          user_id: userId,
          name: extracted.name,
          email: extracted.email,
          company: extracted.company || null,
          role: extracted.role || null,
          location: extracted.location || null,
          category: extracted.category || null,
          background: extracted.background || null,
          relationship_context: relationshipText,
          notes: extracted.notes || null,
          status: "active",
          ai_confidence: extracted.confidence,
          last_interaction_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (insertError) {
        logger.error("Failed to insert contact", {
          name: extracted.name,
          error: insertError.message,
        });
        continue;
      }

      contactId = newContact.id;
      created++;
    }

    if (!contactId) continue;

    // Create contact_meetings junction record
    await supabase.from("contact_meetings").insert({
      user_id: userId,
      contact_id: contactId,
      meeting_id: meetingId,
    });

    // Insert action items
    if (extracted.action_items && extracted.action_items.length > 0) {
      for (const actionText of extracted.action_items) {
        await supabase.from("action_items").insert({
          user_id: userId,
          contact_id: contactId,
          source_meeting_id: meetingId,
          text: actionText,
          completed: false,
        });
      }
    }
  }

  return { created, updated };
}

export const processUserMeetings = task({
  id: "process-user-meetings",
  retry: {
    maxAttempts: 3,
    factor: 1.8,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 30000,
  },
  run: async (payload: { userId: string }) => {
    const supabase = createAdminClient();

    // 1. Get access token
    const accessToken = await getOrRefreshAccessToken(payload.userId);

    // 2. Get user's z.ai API key
    const { data: settings, error: settingsError } = await supabase
      .from("user_settings")
      .select("zai_api_key_encrypted")
      .eq("user_id", payload.userId)
      .single();

    if (settingsError || !settings) {
      logger.error("Failed to read user settings", { error: settingsError?.message });
      return { documentsProcessed: 0, contactsCreated: 0, contactsUpdated: 0 };
    }

    if (!settings.zai_api_key_encrypted) {
      logger.warn("No z.ai API key configured -- cannot run AI extraction", {
        userId: payload.userId,
      });
      return { documentsProcessed: 0, contactsCreated: 0, contactsUpdated: 0 };
    }

    const apiKey = decrypt(settings.zai_api_key_encrypted);

    // 3. Fetch recent Granola documents
    const docsResponse = await getGranolaDocuments(accessToken, 50);

    if (!docsResponse.docs || docsResponse.docs.length === 0) {
      logger.info("No Granola documents found", { userId: payload.userId });
      return { documentsProcessed: 0, contactsCreated: 0, contactsUpdated: 0 };
    }

    // 4. Get already-processed document IDs
    const { data: existingMeetings } = await supabase
      .from("meetings")
      .select("granola_document_id")
      .eq("user_id", payload.userId)
      .not("granola_document_id", "is", null);

    const processedDocIds = new Set(
      (existingMeetings || []).map((m) => m.granola_document_id)
    );

    // Filter to only unprocessed docs
    const newDocs = docsResponse.docs.filter(
      (doc: GranolaDocument) => !processedDocIds.has(doc.id)
    );

    if (newDocs.length === 0) {
      logger.info("All documents already processed", { userId: payload.userId });
      return { documentsProcessed: 0, contactsCreated: 0, contactsUpdated: 0 };
    }

    let documentsProcessed = 0;
    let contactsCreated = 0;
    let contactsUpdated = 0;

    // 5. Process each new document
    for (const doc of newDocs) {
      try {
        // Fetch transcript
        const segments = await getGranolaTranscript(accessToken, doc.id);
        const fullTranscript = segments.map((s) => s.text).join("\n");

        if (!fullTranscript.trim()) {
          logger.info("Empty transcript, skipping", { docId: doc.id });
          continue;
        }

        // Insert meeting record
        const meeting = await insertMeetingRecord(supabase, payload.userId, doc);

        // Get existing contacts for dedup context
        const { data: contacts } = await supabase
          .from("contacts")
          .select("id, name, email")
          .eq("user_id", payload.userId);

        const existingContacts = (contacts || []).map((c) => ({
          id: c.id,
          name: c.name,
          email: c.email,
        }));

        // Run AI extraction
        const extraction = await extractContactsFromTranscript(
          apiKey,
          fullTranscript,
          doc.title,
          existingContacts.map((c) => ({ name: c.name, email: c.email ?? undefined }))
        );

        // Update meeting with AI summary
        if (extraction.meeting_summary) {
          await supabase
            .from("meetings")
            .update({ summary: extraction.meeting_summary })
            .eq("id", meeting.id);
        }

        // Upsert contacts
        const result = await upsertExtractedContacts(
          supabase,
          payload.userId,
          meeting.id,
          extraction.contacts,
          existingContacts
        );

        documentsProcessed++;
        contactsCreated += result.created;
        contactsUpdated += result.updated;

        // Rate limit protection: 200ms delay between transcript fetches
        if (newDocs.indexOf(doc) < newDocs.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
      } catch (err) {
        logger.error("Failed to process document", {
          docId: doc.id,
          error: err instanceof Error ? err.message : String(err),
        });
        // Continue processing other documents
      }
    }

    logger.info("Meeting processing complete", {
      userId: payload.userId,
      documentsProcessed,
      contactsCreated,
      contactsUpdated,
    });

    return { documentsProcessed, contactsCreated, contactsUpdated };
  },
});
