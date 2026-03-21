import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { tasks } from "@trigger.dev/sdk";
import type { processUserMeetings } from "@/trigger/process-user-meetings";
import { apiUnauthorized, apiError } from "@/lib/api/errors";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return apiUnauthorized();
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
    return apiError(
      "Failed to trigger meeting processing",
      500
    );
  }
}
