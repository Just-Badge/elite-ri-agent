import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  sendGmailDraft,
  createGmailDraft,
  deleteGmailDraft,
} from "@/lib/gmail/client";
import { apiUnauthorized, apiNotFound, apiBadRequest } from "@/lib/api/errors";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, context: RouteContext) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiUnauthorized();

  const { id } = await context.params;

  // Fetch draft with contact email
  const { data: draft, error: fetchError } = await supabase
    .from("outreach_drafts")
    .select("*, contacts(name, email)")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !draft) {
    return apiNotFound(fetchError?.message || "Draft not found");
  }

  // Verify status is pending_review
  if (draft.status !== "pending_review") {
    return apiBadRequest("Draft must be in pending_review status to send");
  }

  // Step 1: Delete old Gmail draft if exists (best-effort)
  if (draft.gmail_draft_id) {
    try {
      await deleteGmailDraft(user.id, draft.gmail_draft_id);
    } catch {
      console.error(`Failed to delete old Gmail draft ${draft.gmail_draft_id}`);
    }
  }

  // Step 2: Create fresh Gmail draft from current DB content
  const contactEmail = draft.contacts?.email;
  if (!contactEmail) {
    return apiBadRequest("Contact email not found");
  }

  const newGmailDraftId = await createGmailDraft(
    user.id,
    contactEmail,
    draft.subject,
    draft.body
  );

  // Step 3: Send the newly created draft
  await sendGmailDraft(user.id, newGmailDraftId);

  // Step 4: Update outreach_drafts status
  const now = new Date().toISOString();
  await supabase
    .from("outreach_drafts")
    .update({
      status: "sent",
      sent_at: now,
      reviewed_at: now,
      gmail_draft_id: newGmailDraftId,
      gmail_sync_status: "synced",
    })
    .eq("id", id)
    .eq("user_id", user.id);

  // Step 5: Update contact last_interaction_at
  await supabase
    .from("contacts")
    .update({ last_interaction_at: now })
    .eq("id", draft.contact_id);

  return NextResponse.json({ success: true, gmail_draft_id: newGmailDraftId });
}
