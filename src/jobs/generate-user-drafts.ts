/**
 * Per-User Outreach Draft Generation Job (BullMQ)
 *
 * For a single user: finds contacts due for outreach, generates AI drafts
 * with layered context, persists to outreach_drafts table, and best-effort
 * syncs to Gmail as draft emails.
 *
 * Gmail sync failures are logged but do NOT block draft persistence.
 */

import { Job } from "bullmq";
import { createAdminClient } from "@/lib/supabase/admin";
import { decrypt } from "@/lib/crypto/encryption";
import {
  generateOutreachDraft,
  type DraftContext,
} from "@/lib/ai/draft-outreach";
import { createGmailDraft } from "@/lib/gmail/client";
import { fetchOpenBrainContext } from "@/lib/open-brain/client";

export async function processGenerateUserDrafts(
  job: Job<{ userId: string }>
): Promise<{
  generated: number;
  gmailSynced: number;
  gmailFailed: number;
}> {
  const { userId } = job.data;
  const supabase = createAdminClient();

  // 1. Fetch user settings
  const { data: settings, error: settingsError } = await supabase
    .from("user_settings")
    .select(
      "personality_profile, business_objectives, projects, zai_api_key_encrypted"
    )
    .eq("user_id", userId)
    .single();

  if (settingsError || !settings) {
    console.error("Failed to read user settings for outreach", settingsError?.message);
    return { generated: 0, gmailSynced: 0, gmailFailed: 0 };
  }

  if (!settings.zai_api_key_encrypted) {
    console.warn(`No z.ai API key for user ${userId} -- cannot generate drafts`);
    return { generated: 0, gmailSynced: 0, gmailFailed: 0 };
  }

  // 2. Decrypt z.ai API key
  const apiKey = decrypt(settings.zai_api_key_encrypted);

  // 3. Query contacts due for outreach
  const { data: candidates, error: contactsError } = await supabase
    .from("contacts")
    .select(
      "id, name, email, category, background, relationship_context, notes, outreach_frequency_days, last_interaction_at"
    )
    .eq("user_id", userId)
    .eq("status", "active")
    .not("email", "is", null)
    .not("outreach_frequency_days", "is", null)
    .order("last_interaction_at", { ascending: true, nullsFirst: true })
    .limit(50);

  if (contactsError) {
    console.error("Failed to query due contacts", contactsError.message);
    return { generated: 0, gmailSynced: 0, gmailFailed: 0 };
  }

  // Application-side frequency filtering
  const now = new Date();
  const dueContacts = (candidates || [])
    .filter((contact) => {
      if (!contact.last_interaction_at) return true;
      const lastInteraction = new Date(contact.last_interaction_at);
      const dueDate = new Date(lastInteraction);
      dueDate.setDate(dueDate.getDate() + (contact.outreach_frequency_days || 0));
      return dueDate <= now;
    })
    .slice(0, 20);

  if (!dueContacts || dueContacts.length === 0) {
    console.log(`No contacts due for outreach for user ${userId}`);
    return { generated: 0, gmailSynced: 0, gmailFailed: 0 };
  }

  // Filter out contacts that already have a pending_review draft
  const contactIds = dueContacts.map((c) => c.id);
  const { data: existingDrafts } = await supabase
    .from("outreach_drafts")
    .select("contact_id")
    .in("contact_id", contactIds)
    .eq("status", "pending_review");

  const pendingContactIds = new Set(
    (existingDrafts || []).map((d) => d.contact_id)
  );

  const contactsToDraft = dueContacts.filter(
    (c) => !pendingContactIds.has(c.id)
  );

  if (contactsToDraft.length === 0) {
    console.log(`All due contacts already have pending drafts for user ${userId}`);
    return { generated: 0, gmailSynced: 0, gmailFailed: 0 };
  }

  let generated = 0;
  let gmailSynced = 0;
  let gmailFailed = 0;

  // 4. Process each due contact sequentially
  for (const contact of contactsToDraft) {
    try {
      // a. Fetch recent meetings for this contact
      const { data: contactMeetings } = await supabase
        .from("contact_meetings")
        .select("meeting_id, meetings(id, title, summary, meeting_date)")
        .eq("contact_id", contact.id)
        .order("created_at", { ascending: false })
        .limit(5);

      const recentMeetings = (contactMeetings || [])
        .map((cm) => {
          const meeting = cm.meetings as unknown as {
            id: string;
            title: string;
            summary: string | null;
            meeting_date: string;
          } | null;
          if (!meeting) return null;
          return {
            title: meeting.title || "Untitled Meeting",
            summary: meeting.summary || undefined,
            date: meeting.meeting_date,
          };
        })
        .filter(
          (m): m is { title: string; summary: string | undefined; date: string } =>
            m !== null
        );

      // b. Fetch action items
      const { data: actionItemsData } = await supabase
        .from("action_items")
        .select("text, completed")
        .eq("contact_id", contact.id)
        .order("created_at", { ascending: false });

      const actionItems = (actionItemsData || []).map((ai) => ({
        text: ai.text,
        completed: ai.completed,
      }));

      // c. Fetch Open Brain context
      const openBrainContext = await fetchOpenBrainContext(
        userId,
        contact.name,
        contact.email
      );

      // d. Build DraftContext with all 5 layers
      const draftContext: DraftContext = {
        userProfile: {
          personality_profile:
            settings.personality_profile || "Professional and friendly",
          business_objectives: settings.business_objectives || undefined,
          projects: settings.projects || undefined,
        },
        contact: {
          name: contact.name,
          email: contact.email,
          category: contact.category || undefined,
          background: contact.background || undefined,
          relationship_context:
            (contact.relationship_context as DraftContext["contact"]["relationship_context"]) ||
            undefined,
          notes: contact.notes || undefined,
        },
        recentMeetings,
        actionItems,
        openBrainContext,
      };

      // e. Generate AI draft
      const draft = await generateOutreachDraft(apiKey, draftContext);

      // f. Persist draft to outreach_drafts table FIRST
      const { data: insertedDraft, error: insertError } = await supabase
        .from("outreach_drafts")
        .insert({
          user_id: userId,
          contact_id: contact.id,
          subject: draft.subject,
          body: draft.body,
          ai_rationale: draft.rationale,
          status: "pending_review",
          gmail_sync_status: "pending",
        })
        .select("id")
        .single();

      if (insertError) {
        console.error(`Failed to insert draft for contact ${contact.id}:`, insertError.message);
        continue;
      }

      generated++;

      // g. Best-effort Gmail sync
      try {
        const gmailDraftId = await createGmailDraft(
          userId,
          contact.email,
          draft.subject,
          draft.body
        );

        await supabase
          .from("outreach_drafts")
          .update({
            gmail_draft_id: gmailDraftId,
            gmail_sync_status: "synced",
          })
          .eq("id", insertedDraft.id);

        gmailSynced++;
      } catch (gmailError) {
        console.warn(
          `Gmail draft sync failed for contact ${contact.id} -- draft still saved to DB:`,
          gmailError instanceof Error ? gmailError.message : String(gmailError)
        );

        await supabase
          .from("outreach_drafts")
          .update({ gmail_sync_status: "failed" })
          .eq("id", insertedDraft.id);

        gmailFailed++;
      }

      // h. 200ms delay before next contact (rate limit protection)
      if (contactsToDraft.indexOf(contact) < contactsToDraft.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    } catch (err) {
      console.error(
        `Failed to generate draft for contact ${contact.id}:`,
        err instanceof Error ? err.message : String(err)
      );
    }
  }

  console.log(
    `[drafts] Complete for user ${userId}: generated=${generated}, gmailSynced=${gmailSynced}, gmailFailed=${gmailFailed}`
  );

  return { generated, gmailSynced, gmailFailed };
}
