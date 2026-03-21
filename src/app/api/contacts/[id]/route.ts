import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { contactUpdateSchema } from "@/lib/validations/contacts";
import { ZodError } from "zod";
import { apiUnauthorized, apiError, apiNotFound, apiBadRequest, apiValidationError } from "@/lib/api/errors";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiUnauthorized();

  const { id } = await context.params;

  const { data, error } = await supabase
    .from("contacts")
    .select(
      "*, action_items(*), contact_meetings(meeting_id, meetings(id, title, meeting_date, summary, granola_url))"
    )
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return apiNotFound("Contact not found");
    }
    return apiError(error.message, 500);
  }

  return NextResponse.json({ data });
}

export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiUnauthorized();

  const { id } = await context.params;

  try {
    const body = await request.json();
    const parsed = contactUpdateSchema.parse({ ...body, id });

    // Remove id from the update payload
    const { id: _id, ...updateData } = parsed;

    const { error } = await supabase
      .from("contacts")
      .update({ ...updateData, ai_confidence: "manual", updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      return apiError(error.message, 500);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof ZodError) {
      return apiValidationError(err);
    }
    return apiBadRequest("Invalid request body");
  }
}

export async function DELETE(
  _request: NextRequest,
  context: RouteContext
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiUnauthorized();

  const { id } = await context.params;

  const { error } = await supabase
    .from("contacts")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return apiError(error.message, 500);
  }

  return NextResponse.json({ success: true });
}
