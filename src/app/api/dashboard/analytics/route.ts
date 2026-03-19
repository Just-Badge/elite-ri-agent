import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { subDays } from "date-fns";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = request.nextUrl;
  const period = searchParams.get("period") ?? "30d";

  // Compute start date based on period
  let startDate: string | null = null;
  if (period !== "all") {
    const daysMap: Record<string, number> = {
      "7d": 7,
      "30d": 30,
      "90d": 90,
    };
    const days = daysMap[period] ?? 30;
    startDate = subDays(new Date(), days).toISOString();
  }

  // Build query
  let query = supabase
    .from("outreach_drafts")
    .select("status, created_at")
    .eq("user_id", user.id);

  if (startDate) {
    query = query.gte("created_at", startDate);
  }

  const { data: drafts, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const allDrafts = drafts ?? [];

  // Group by month (YYYY-MM)
  const monthMap = new Map<
    string,
    { sent: number; dismissed: number; pending: number; total: number }
  >();

  for (const draft of allDrafts) {
    const month = draft.created_at?.slice(0, 7) ?? "unknown";
    if (!monthMap.has(month)) {
      monthMap.set(month, { sent: 0, dismissed: 0, pending: 0, total: 0 });
    }
    const entry = monthMap.get(month)!;
    entry.total++;

    if (draft.status === "sent") {
      entry.sent++;
    } else if (draft.status === "dismissed") {
      entry.dismissed++;
    } else {
      // pending_review and approved both count as pending
      entry.pending++;
    }
  }

  // Convert to sorted array
  const by_month = Array.from(monthMap.entries())
    .map(([month, counts]) => ({ month, ...counts }))
    .sort((a, b) => a.month.localeCompare(b.month));

  // Compute totals
  const totals = {
    sent: allDrafts.filter((d) => d.status === "sent").length,
    dismissed: allDrafts.filter((d) => d.status === "dismissed").length,
    pending: allDrafts.filter(
      (d) => d.status === "pending_review" || d.status === "approved"
    ).length,
    total: allDrafts.length,
  };

  return NextResponse.json({
    data: { by_month, totals },
  });
}
