/**
 * BullMQ Worker Entry Point
 *
 * This is a standalone Node.js process that runs alongside the Next.js app.
 * It processes all background jobs: meeting sync, enrichment, outreach drafts,
 * and token keepalive.
 *
 * Run: npx tsx src/worker.ts
 * Or in production: node dist/worker.js
 *
 * Requires REDIS_URL and all the same env vars as the Next.js app
 * (Supabase, encryption key, Google OAuth, etc.)
 */

import { Worker } from "bullmq";
import { workerConnection } from "@/lib/queue/connection";
import { getMeetingQueue, getOutreachQueue, getMaintenanceQueue } from "@/lib/queue/queues";

// Job processors
import { processMeetingDispatcher } from "@/jobs/meeting-dispatcher";
import { processSyncGranolaMeetings } from "@/jobs/sync-granola-meetings";
import { processEnrichMeetingContacts } from "@/jobs/enrich-meeting-contacts";
import { processOutreachDispatcher } from "@/jobs/outreach-dispatcher";
import { processGenerateUserDrafts } from "@/jobs/generate-user-drafts";
import { processTokenKeepalive } from "@/jobs/token-keepalive";

console.log("╔══════════════════════════════════════════════╗");
console.log("║  Elite RI Agent — BullMQ Worker Starting...  ║");
console.log("╚══════════════════════════════════════════════╝");
console.log(`Redis: ${process.env.REDIS_URL || "redis://localhost:6379"}`);
console.log(`Time: ${new Date().toISOString()}`);

// ─── Meeting Queue Worker ────────────────────────────────────────────
const meetingWorker = new Worker(
  getMeetingQueue().name,
  async (job) => {
    console.log(`[meetings] Processing job: ${job.name} (${job.id})`);

    switch (job.name) {
      case "meeting-dispatcher":
        return processMeetingDispatcher(job);
      case "sync-granola-meetings":
        return processSyncGranolaMeetings(job);
      case "enrich-meeting-contacts":
        return processEnrichMeetingContacts(job);
      default:
        console.warn(`[meetings] Unknown job name: ${job.name}`);
        return { error: `Unknown job: ${job.name}` };
    }
  },
  {
    connection: workerConnection,
    concurrency: 3,
    limiter: {
      max: 10,
      duration: 60000, // 10 jobs per minute max
    },
  }
);

// ─── Outreach Queue Worker ───────────────────────────────────────────
const outreachWorker = new Worker(
  getOutreachQueue().name,
  async (job) => {
    console.log(`[outreach] Processing job: ${job.name} (${job.id})`);

    switch (job.name) {
      case "outreach-dispatcher":
        return processOutreachDispatcher(job);
      case "generate-user-drafts":
        return processGenerateUserDrafts(job);
      default:
        console.warn(`[outreach] Unknown job name: ${job.name}`);
        return { error: `Unknown job: ${job.name}` };
    }
  },
  {
    connection: workerConnection,
    concurrency: 2,
  }
);

// ─── Maintenance Queue Worker ────────────────────────────────────────
const maintenanceWorker = new Worker(
  getMaintenanceQueue().name,
  async (job) => {
    console.log(`[maintenance] Processing job: ${job.name} (${job.id})`);

    switch (job.name) {
      case "token-keepalive":
        return processTokenKeepalive(job);
      default:
        console.warn(`[maintenance] Unknown job name: ${job.name}`);
        return { error: `Unknown job: ${job.name}` };
    }
  },
  {
    connection: workerConnection,
    concurrency: 1,
  }
);

// ─── Register Cron Schedules ─────────────────────────────────────────
async function registerSchedules() {
  // Meeting dispatcher: every hour at :00
  await getMeetingQueue().upsertJobScheduler(
    "meeting-dispatcher-cron",
    { pattern: "0 * * * *" },
    { name: "meeting-dispatcher", data: {}, opts: {} }
  );
  console.log("✓ Registered: meeting-dispatcher (hourly)");

  // Outreach dispatcher: every hour at :00
  await getOutreachQueue().upsertJobScheduler(
    "outreach-dispatcher-cron",
    { pattern: "0 * * * *" },
    { name: "outreach-dispatcher", data: {}, opts: {} }
  );
  console.log("✓ Registered: outreach-dispatcher (hourly)");

  // Token keepalive: every 6 hours
  await getMaintenanceQueue().upsertJobScheduler(
    "token-keepalive-cron",
    { pattern: "0 */6 * * *" },
    { name: "token-keepalive", data: {}, opts: {} }
  );
  console.log("✓ Registered: token-keepalive (every 6 hours)");
}

// ─── Event Handlers ──────────────────────────────────────────────────
for (const [name, worker] of [
  ["meetings", meetingWorker],
  ["outreach", outreachWorker],
  ["maintenance", maintenanceWorker],
] as const) {
  worker.on("completed", (job) => {
    console.log(`[${name}] ✓ ${job.name} (${job.id}) completed`);
  });

  worker.on("failed", (job, err) => {
    console.error(
      `[${name}] ✗ ${job?.name} (${job?.id}) failed: ${err.message}`
    );
  });

  worker.on("error", (err) => {
    console.error(`[${name}] Worker error:`, err.message);
  });
}

// ─── Graceful Shutdown ───────────────────────────────────────────────
let isShuttingDown = false;

async function shutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`\n${signal} received — shutting down workers gracefully...`);

  const timeout = parseInt(process.env.SHUTDOWN_TIMEOUT || "30000", 10);

  try {
    await Promise.race([
      Promise.all([
        meetingWorker.close(),
        outreachWorker.close(),
        maintenanceWorker.close(),
      ]),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Shutdown timeout")), timeout)
      ),
    ]);
    console.log("Workers shut down cleanly.");
  } catch (err) {
    console.error("Shutdown error:", err instanceof Error ? err.message : err);
  }

  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

// ─── Start ───────────────────────────────────────────────────────────
registerSchedules()
  .then(() => {
    console.log("\n═══════════════════════════════════════════");
    console.log("  Worker ready — listening for jobs...");
    console.log("═══════════════════════════════════════════\n");
  })
  .catch((err) => {
    console.error("Failed to register schedules:", err);
    process.exit(1);
  });
