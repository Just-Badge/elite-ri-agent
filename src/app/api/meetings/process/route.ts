import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { tasks, auth } from "@trigger.dev/sdk";
import type { syncGranolaMeetings } from "@/trigger/sync-granola-meetings";
import { apiUnauthorized, apiError } from "@/lib/api/errors";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return apiUnauthorized();
  }

  if (!process.env.TRIGGER_SECRET_KEY) {
    return apiError(
      "Trigger.dev is not configured. Add TRIGGER_SECRET_KEY to environment variables.",
      503
    );
  }

  try {
    const handle = await tasks.trigger<typeof syncGranolaMeetings>(
      "sync-granola-meetings",
      { userId: user.id }
    );

    // Generate a public token so the frontend can subscribe to realtime updates
    const publicToken = await auth.createPublicToken({
      scopes: {
        read: { runs: [handle.id] },
      },
      expirationTime: "1h",
    });

    return NextResponse.json({
      runId: handle.id,
      publicToken,
      apiUrl: process.env.TRIGGER_API_URL,
      status: "triggered",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return apiError(
      `Failed to trigger meeting processing: ${message}`,
      500
    );
  }
}
