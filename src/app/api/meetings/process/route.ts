import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { tasks, runs } from "@trigger.dev/sdk";
import type { syncGranolaMeetings } from "@/trigger/sync-granola-meetings";
import { apiUnauthorized, apiError } from "@/lib/api/errors";

/**
 * Key used to store the user ID in Trigger.dev run metadata.
 * This allows us to verify run ownership when querying status.
 */
const USER_ID_METADATA_KEY = "userId";

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
      { userId: user.id },
      {
        metadata: {
          [USER_ID_METADATA_KEY]: user.id,
        },
      }
    );

    return NextResponse.json({
      runId: handle.id,
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

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return apiUnauthorized();
  }

  const { searchParams } = new URL(request.url);
  const runId = searchParams.get("runId");

  if (!runId) {
    return apiError("runId is required", 400);
  }

  try {
    const run = await runs.retrieve(runId);

    // Verify run ownership - user can only access their own runs
    const runUserId = run.metadata?.[USER_ID_METADATA_KEY];
    if (runUserId !== user.id) {
      return apiError("Run not found or access denied", 404);
    }

    return NextResponse.json({
      status: run.status,
      output: run.output,
      metadata: run.metadata,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return apiError(`Failed to get run status: ${message}`, 500);
  }
}
