import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { DRAFT_STATUSES, type DraftStatus } from "@/lib/validations/drafts";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function POST() {
  return NextResponse.json(
    { error: "Not implemented" },
    { status: 501 }
  );
}
