/**
 * Bull Board Admin Dashboard — API Route
 *
 * Provides a JSON API for queue status monitoring.
 * GET /api/admin/queues — returns status of all queues
 * POST /api/admin/queues — trigger a specific job manually
 *
 * TODO: Add authentication check (admin only)
 */

import { NextRequest, NextResponse } from "next/server";
import { Queue } from "bullmq";
import { getMeetingQueue, getOutreachQueue, getMaintenanceQueue } from "@/lib/queue/queues";

async function getQueueStatus(queue: Queue) {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
  ]);

  return {
    name: queue.name,
    waiting,
    active,
    completed,
    failed,
    delayed,
    total: waiting + active + delayed,
  };
}

export async function GET() {
  try {
    const [meetings, outreach, maintenance] = await Promise.all([
      getQueueStatus(getMeetingQueue()),
      getQueueStatus(getOutreachQueue()),
      getQueueStatus(getMaintenanceQueue()),
    ]);

    return NextResponse.json({
      queues: [meetings, outreach, maintenance],
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to fetch queue status", details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body as { action: string };

    if (action === "trigger-meeting-dispatcher") {
      await getMeetingQueue().add("meeting-dispatcher", {}, {
        jobId: `manual-meeting-${Date.now()}`,
      });
      return NextResponse.json({ ok: true, message: "Meeting dispatcher triggered" });
    }

    if (action === "trigger-outreach-dispatcher") {
      await getOutreachQueue().add("outreach-dispatcher", {}, {
        jobId: `manual-outreach-${Date.now()}`,
      });
      return NextResponse.json({ ok: true, message: "Outreach dispatcher triggered" });
    }

    if (action === "trigger-token-keepalive") {
      await getMaintenanceQueue().add("token-keepalive", {}, {
        jobId: `manual-keepalive-${Date.now()}`,
      });
      return NextResponse.json({ ok: true, message: "Token keepalive triggered" });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to process action", details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
