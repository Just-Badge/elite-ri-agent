import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { DRAFT_STATUSES, type DraftStatus } from "@/lib/validations/drafts";
import { apiUnauthorized, apiError } from "@/lib/api/errors";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiUnauthorized();

  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status") as DraftStatus | null;

  let query = supabase
    .from("outreach_drafts")
    .select("*, contacts(name, email)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (status && DRAFT_STATUSES.includes(status)) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    return apiError(error.message, 500);
  }

  return NextResponse.json({ data });
}

export async function POST() {
  return apiError("Not implemented", 501);
}
