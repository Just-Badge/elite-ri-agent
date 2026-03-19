import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { draftUpdateSchema } from "@/lib/validations/drafts";
import { deleteGmailDraft } from "@/lib/gmail/client";
import { ZodError } from "zod";

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, context: RouteContext) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;

  try {
    const body = await request.json();
    const parsed = draftUpdateSchema.parse(body);

    const { error } = await supabase
      .from("outreach_drafts")
      .update({ ...parsed, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation failed", issues: err.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;

  // Fetch draft to get gmail_draft_id
  const { data: draft, error: fetchError } = await supabase
    .from("outreach_drafts")
    .select("id, gmail_draft_id, user_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  // Best-effort delete Gmail draft
  if (draft?.gmail_draft_id) {
    try {
      await deleteGmailDraft(user.id, draft.gmail_draft_id);
    } catch {
      // Best-effort: log but don't fail
      console.error(`Failed to delete Gmail draft ${draft.gmail_draft_id}`);
    }
  }

  // Mark as dismissed in DB
  const { error: updateError } = await supabase
    .from("outreach_drafts")
    .update({
      status: "dismissed",
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
