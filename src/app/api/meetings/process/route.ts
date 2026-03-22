import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getMeetingQueue } from "@/lib/queue/queues";
import { apiUnauthorized, apiError } from "@/lib/api/errors";

/**
 * POST /api/meetings/process
 * Manually trigger meeting sync for the authenticated user.
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return apiUnauthorized();
  }

  try {
    const queue = getMeetingQueue();
    const job = await queue.add(
      "sync-granola-meetings",
      { userId: user.id },
      {
        jobId: `manual-sync-${user.id}-${Date.now()}`,
      }
    );

    return NextResponse.json({
      jobId: job.id,
      status: "queued",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return apiError(
      `Failed to trigger meeting processing: ${message}`,
      500
    );
  }
}

/**
 * GET /api/meetings/process?jobId=xxx
 * Check the status of a meeting sync job.
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return apiUnauthorized();
  }

  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get("jobId");

  if (!jobId) {
    return apiError("jobId is required", 400);
  }

  try {
    const queue = getMeetingQueue();
    const job = await queue.getJob(jobId);

    if (!job) {
      return apiError("Job not found", 404);
    }

    // Verify ownership: job data must contain the user's ID
    if (job.data?.userId !== user.id) {
      return apiError("Job not found or access denied", 404);
    }

    const state = await job.getState();
    const progress = job.progress;

    return NextResponse.json({
      status: state,
      progress,
      result: job.returnvalue,
      failedReason: job.failedReason,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return apiError(`Failed to get job status: ${message}`, 500);
  }
}
