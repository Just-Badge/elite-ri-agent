import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { tasks } from "@trigger.dev/sdk";
import type { processUserMeetings } from "@/trigger/process-user-meetings";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const handle = await tasks.trigger<typeof processUserMeetings>(
      "process-user-meetings",
      { userId: user.id }
    );

    return NextResponse.json({
      runId: handle.id,
      status: "triggered",
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "Failed to trigger meeting processing",
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
