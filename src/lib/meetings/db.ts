/**
 * Shared meeting + contact DB operations.
 *
 * Used by both sync-granola-meetings (basic upsert) and
 * enrich-meeting-contacts (AI-enriched upsert).
 */

/** Simple logger that replaces Trigger.dev's logger */
const logger = {
  info: (msg: string, meta?: Record<string, unknown>) => console.log(`[db] ${msg}`, meta || ""),
  warn: (msg: string, meta?: Record<string, unknown>) => console.warn(`[db] ${msg}`, meta || ""),
  error: (msg: string, meta?: Record<string, unknown>) => console.error(`[db] ${msg}`, meta || ""),
};
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ExtractedContact } from "@/lib/ai/types";

/**
 * Insert a meeting record from a Granola document.
 */
export async function insertMeetingRecord(
  supabase: SupabaseClient,
  userId: string,
  doc: { id: string; title: string; date: string }
) {
  const granolaUrl = `https://app.granola.so/notes/${doc.id}`;

  const { data: meeting, error } = await supabase
    .from("meetings")
    .insert({
      user_id: userId,
      granola_document_id: doc.id,
      title: doc.title || null,
      meeting_date: new Date(doc.date).toISOString(),
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
 * Upsert a basic contact from meeting participant data.
 * Only sets name, email, company — no AI enrichment.
 */
export async function upsertBasicContact(
  supabase: SupabaseClient,
  userId: string,
  participant: { name: string; email?: string; company?: string }
): Promise<{ contactId: string; isNew: boolean }> {
  // Try email match first
  if (participant.email) {
    const { data: existing } = await supabase
      .from("contacts")
      .select("id")
      .eq("user_id", userId)
      .ilike("email", participant.email)
      .single();

    if (existing) {
      // Update company if we have it and they don't
      if (participant.company) {
        await supabase
          .from("contacts")
          .update({
            company: participant.company,
            last_interaction_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id)
          .is("company", null);
      } else {
        await supabase
          .from("contacts")
          .update({
            last_interaction_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
      }

      return { contactId: existing.id, isNew: false };
    }
  }

  // Try name match
  const { data: nameMatch } = await supabase
    .from("contacts")
    .select("id")
    .eq("user_id", userId)
    .ilike("name", participant.name)
    .single();

  if (nameMatch) {
    const updates: Record<string, unknown> = {
      last_interaction_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    if (participant.email) updates.email = participant.email;
    if (participant.company) updates.company = participant.company;

    await supabase.from("contacts").update(updates).eq("id", nameMatch.id);

    return { contactId: nameMatch.id, isNew: false };
  }

  // Insert new contact
  const { data: newContact, error } = await supabase
    .from("contacts")
    .insert({
      user_id: userId,
      name: participant.name,
      email: participant.email || null,
      company: participant.company || null,
      status: "active",
      ai_confidence: "medium",
      last_interaction_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`Failed to insert contact ${participant.name}: ${error.message}`);
  }

  return { contactId: newContact.id, isNew: true };
}

/**
 * Upsert AI-enriched contacts from transcript extraction.
 * Merges enriched fields into existing contacts.
 */
export async function upsertEnrichedContacts(
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

    // Store relationship_context as JSONB object directly
    const relationshipData = extracted.relationship_context || null;

    // Strategy 1: Match by email
    const emailMatch = extracted.email
      ? existingContacts.find(
          (c) => c.email && c.email.toLowerCase() === extracted.email!.toLowerCase()
        )
      : null;

    if (emailMatch) {
      const updateFields: Record<string, unknown> = {};
      if (extracted.company) updateFields.company = extracted.company;
      if (extracted.role) updateFields.role = extracted.role;
      if (extracted.location) updateFields.location = extracted.location;
      if (extracted.category) updateFields.category = extracted.category;
      if (extracted.background) updateFields.background = extracted.background;
      if (relationshipData) updateFields.relationship_context = relationshipData;
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
      // Strategy 2: Name match (cautious update)
      const nameMatch = existingContacts.find(
        (c) => c.name.toLowerCase() === extracted.name.toLowerCase()
      );

      if (nameMatch) {
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
          if (!fullContact.relationship_context && relationshipData) {
            cautionUpdate.relationship_context = relationshipData;
          }
          if (!fullContact.notes && extracted.notes) cautionUpdate.notes = extracted.notes;
          cautionUpdate.updated_at = new Date().toISOString();
          cautionUpdate.last_interaction_at = new Date().toISOString();

          if (Object.keys(cautionUpdate).length > 2) {
            await supabase.from("contacts").update(cautionUpdate).eq("id", nameMatch.id);
          }
        }

        contactId = nameMatch.id;
        updated++;
      } else {
        // Insert new
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
            relationship_context: relationshipData,
            notes: extracted.notes || null,
            status: "active",
            ai_confidence: extracted.confidence,
            last_interaction_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select("id")
          .single();

        if (insertError) {
          logger.error("Failed to insert contact", { name: extracted.name, error: insertError.message });
          continue;
        }
        contactId = newContact.id;
        created++;
      }
    } else {
      // New email — INSERT
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
          relationship_context: relationshipData,
          notes: extracted.notes || null,
          status: "active",
          ai_confidence: extracted.confidence,
          last_interaction_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (insertError) {
        logger.error("Failed to insert contact", { name: extracted.name, error: insertError.message });
        continue;
      }
      contactId = newContact.id;
      created++;
    }

    if (!contactId) continue;

    // Create contact_meetings junction with duplicate-safe handling
    const { error: junctionError } = await supabase
      .from("contact_meetings")
      .upsert(
        {
          user_id: userId,
          contact_id: contactId,
          meeting_id: meetingId,
        },
        { onConflict: "contact_id,meeting_id", ignoreDuplicates: true }
      );

    if (junctionError && junctionError.code !== "23505") {
      // Log but don't fail - one duplicate should not break the whole enrichment
      logger.error("Failed to create contact_meetings junction", {
        contactId,
        meetingId,
        error: junctionError.message,
      });
    }

    // Insert action items
    if (extracted.action_items && extracted.action_items.length > 0) {
      for (const actionText of extracted.action_items) {
        await supabase.from("action_items").insert({
          user_id: userId,
          contact_id: contactId,
          meeting_id: meetingId,
          text: actionText,
          completed: false,
        });
      }
    }
  }

  return { created, updated };
}
