# Trigger.dev v4 — Cheat Sheet & Self-Hosting Guide

## What is Trigger.dev?

Trigger.dev is a **background job and workflow engine** for TypeScript/Node.js. It lets you run long-running tasks, scheduled jobs, and multi-step workflows outside your web server — with built-in retries, observability, and real-time status updates.

**Think of it as:** A managed job queue where each "job" is a TypeScript function that can run for minutes/hours, survive crashes, and report progress back to your UI in real-time.

---

## Core Concepts

### Tasks
The fundamental unit. A task is an async TypeScript function that runs in an isolated environment.

```ts
import { task } from "@trigger.dev/sdk";

export const processVideo = task({
  id: "process-video",
  retry: { maxAttempts: 3 },
  run: async (payload: { videoUrl: string }) => {
    // This can run for hours — no timeout limits
    const result = await transcodeVideo(payload.videoUrl);
    return { outputUrl: result.url };
  },
});
```

### Scheduled Tasks (Cron)
Recurring tasks on a schedule.

```ts
import { schedules } from "@trigger.dev/sdk";

export const dailyCleanup = schedules.task({
  id: "daily-cleanup",
  cron: "0 2 * * *", // 2am UTC daily
  run: async (payload) => {
    // payload.timestamp = scheduled time
    // payload.lastTimestamp = previous run time
    await cleanupOldRecords();
  },
});
```

### Triggering Tasks

```ts
// From your Next.js API route or server action:
import { tasks } from "@trigger.dev/sdk";
import type { processVideo } from "./trigger/tasks";

// Fire and forget
const handle = await tasks.trigger<typeof processVideo>("process-video", {
  videoUrl: "https://example.com/video.mp4",
});

// Trigger and wait for result
const result = await processVideo.triggerAndWait({ videoUrl: "..." });
if (result.ok) {
  console.log(result.output); // { outputUrl: "..." }
}
```

### Parent/Child Tasks

```ts
export const pipeline = task({
  id: "pipeline",
  run: async (payload) => {
    // Sequential: trigger child and wait
    const step1 = await extractData.triggerAndWait({ url: payload.url });

    // Parallel: batch trigger multiple children
    const results = await processItems.batchTriggerAndWait(
      payload.items.map((item) => ({ payload: { item } }))
    );

    return { processed: results.filter((r) => r.ok).length };
  },
});
```

> **Never** use `Promise.all` with `triggerAndWait` — use `batchTriggerAndWait` instead.

---

## Use Cases

### 1. Agentic Workflows
Run AI agent loops as background tasks — no request timeouts.

```ts
export const aiAgent = task({
  id: "ai-agent",
  maxDuration: 600, // 10 minutes
  run: async (payload: { prompt: string; userId: string }) => {
    let result = await callLLM(payload.prompt);

    while (result.needsMoreWork) {
      // Use tools, call APIs, process data — no timeout
      const toolOutput = await executeTool(result.toolCall);
      result = await callLLM(toolOutput);

      // Report progress to UI in real-time
      metadata.set("status", result.status);
      metadata.set("steps", result.stepCount);
    }

    return { answer: result.finalAnswer };
  },
});
```

### 2. Data Processing Pipelines
Fan-out/fan-in patterns for batch processing.

```ts
export const dispatcher = schedules.task({
  id: "hourly-sync",
  cron: "0 * * * *",
  run: async () => {
    const users = await db.getActiveUsers();
    // Fan out: one task per user
    await syncUserData.batchTrigger(
      users.map((u) => ({ payload: { userId: u.id } }))
    );
  },
});
```

### 3. Meeting/Email Automation (What Elite RI Does)
- Hourly cron fetches new meetings from Granola
- Per-user tasks extract contacts via AI
- Draft generation tasks create follow-up emails

### 4. Webhook Processing
Handle incoming webhooks reliably with retries.

### 5. Scheduled Reports & Notifications
Daily/weekly reports, digest emails, metric calculations.

---

## Real-Time UI Updates

### Backend: Track Progress with Metadata

```ts
import { task, metadata } from "@trigger.dev/sdk";

export const batchJob = task({
  id: "batch-job",
  run: async (payload: { items: string[] }) => {
    metadata.set("total", payload.items.length);

    for (let i = 0; i < payload.items.length; i++) {
      await processItem(payload.items[i]);
      metadata.set("progress", i + 1);
      metadata.set("percent", Math.round(((i + 1) / payload.items.length) * 100));
    }
  },
});
```

### Frontend: Subscribe to Updates

```tsx
"use client";
import { useRealtimeRun } from "@trigger.dev/react-hooks";

function ProgressTracker({ runId, accessToken }: { runId: string; accessToken: string }) {
  const { run } = useRealtimeRun(runId, { accessToken });

  if (!run) return <div>Loading...</div>;

  return (
    <div>
      <div>Status: {run.status}</div>
      <div>Progress: {run.metadata?.percent || 0}%</div>
      {run.status === "COMPLETED" && <div>Done! {JSON.stringify(run.output)}</div>}
    </div>
  );
}
```

### Generate Access Tokens (Server-Side)

```ts
import { auth } from "@trigger.dev/sdk";

// In your API route:
const token = await auth.createPublicToken({
  scopes: { read: { runs: [runId] } },
  expirationTime: "1h",
});
```

---

## Project Setup

### 1. Install

```bash
npm install @trigger.dev/sdk
npx trigger.dev@latest init  # creates trigger.config.ts + example task
```

### 2. Configure (`trigger.config.ts`)

```ts
import { defineConfig } from "@trigger.dev/sdk";

export default defineConfig({
  project: "proj_your_project_ref",
  dirs: ["./src/trigger"],
  runtime: "node",
  retries: {
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 10000,
      factor: 2,
    },
  },
});
```

### 3. Dev Mode

```bash
npx trigger.dev@latest dev  # connects local tasks to Trigger.dev
```

### 4. Deploy Tasks

```bash
npx trigger.dev@latest deploy  # bundles and deploys to Trigger.dev
```

---

## Self-Hosting on Coolify (v4) — Complete Guide

### Architecture

```
┌─────────────────────────────────────────────────────┐
│                 Coolify Service                      │
│                                                      │
│  ┌──────────┐  ┌───────┐  ┌──────────┐  ┌────────┐ │
│  │ postgres │  │ redis │  │clickhouse│  │electric│ │
│  └────┬─────┘  └───┬───┘  └────┬─────┘  └───┬────┘ │
│       │            │           │             │       │
│       └──────┬─────┴───────────┴─────────────┘       │
│              │                                       │
│       ┌──────▼──────┐                                │
│       │   trigger   │ (webapp — the API/UI)          │
│       │  port 3000  │                                │
│       └──────┬──────┘                                │
│              │ writes bootstrap token                │
│              │ to shared volume                      │
│              ▼                                       │
│       ┌─────────────┐     ┌──────────────┐          │
│       │ supervisor  │────▶│ docker-proxy │          │
│       │  port 8020  │     │  port 2375   │          │
│       └──────┬──────┘     └──────┬───────┘          │
│              │                   │                   │
│              │ spawns worker     │ Docker socket     │
│              │ containers        │ access (read-only)│
│              ▼                   │                   │
│       ┌─────────────┐           │                   │
│       │   worker    │◀──────────┘                   │
│       │ (per task)  │                                │
│       └─────────────┘                                │
└─────────────────────────────────────────────────────┘
```

### Critical Environment Variables

These are set at the **Coolify service level** (shared across all containers via `.env`):

| Variable | Value | Why |
|----------|-------|-----|
| `TRIGGER_WORKER_TOKEN` | `file:///home/node/shared/worker_token` | Supervisor reads the bootstrap-generated token from the shared volume. **Never hardcode this.** |
| `MANAGED_WORKER_SECRET` | `${SERVICE_PASSWORD_64_WORKERSECRET}` | Shared secret between webapp and supervisor. Auto-generated by Coolify. |
| `DOCKER_RUNNER_NETWORKS` | `<coolify-network-name>` | The Docker network worker containers join. Use your Coolify service UUID (e.g., `zc0kkc484gow04sc8ggs00gg`). |
| `TRIGGER_WORKLOAD_API_DOMAIN` | `supervisor` | How spawned workers find the supervisor container. |

### The Issue We Hit (And How We Fixed It)

**Symptoms:**
- Supervisor container in a restart loop
- All runs stuck in `queued` forever — zero runs ever completed
- Webapp healthy, API responding, tasks registered
- Coolify showing service as `degraded:unhealthy`

**Root Cause:** Three environment variables were misconfigured:

1. **`DOCKER_RUNNER_NETWORKS` was empty** — Coolify resolves missing env vars to `null` instead of leaving them unset, which breaks Docker Compose `${VAR:-default}` syntax. The supervisor couldn't tell worker containers which Docker network to join.

2. **`TRIGGER_WORKLOAD_API_DOMAIN` was empty** — Same Coolify/Docker Compose default issue. Workers couldn't find the supervisor to report back.

3. **`TRIGGER_WORKER_TOKEN` was hardcoded to the wrong value** — Someone set it to the same value as `MANAGED_WORKER_SECRET`. These are **different things**: the worker token authenticates the supervisor to the webapp, while the managed worker secret is a shared signing key. The webapp's bootstrap mechanism generates the real worker token and writes it to `/home/node/shared/worker_token`. The supervisor should read from this file, not use a hardcoded value.

**The Fix:**
```
DOCKER_RUNNER_NETWORKS=zc0kkc484gow04sc8ggs00gg    (your Coolify network)
TRIGGER_WORKLOAD_API_DOMAIN=supervisor               (container hostname)
TRIGGER_WORKER_TOKEN=file:///home/node/shared/worker_token  (read from bootstrap file)
```

**Key Lesson:** In Coolify, always set env vars **explicitly** — never rely on Docker Compose `${VAR:-default}` syntax because Coolify resolves missing vars to `null` instead of leaving them unset.

### How Bootstrap Works

1. Webapp starts with `TRIGGER_BOOTSTRAP_ENABLED=1`
2. Webapp creates a "bootstrap" worker group in the database
3. Webapp generates an auth token and writes it to `/home/node/shared/worker_token`
4. Supervisor starts (depends_on: trigger healthy)
5. Supervisor reads the token from the shared volume file
6. Supervisor authenticates to the webapp using this token
7. Supervisor begins dequeuing and executing runs

The shared volume (`shared-data:/home/node/shared`) is the bridge between webapp and supervisor. If this volume is lost or the token file doesn't exist, the supervisor can't authenticate.

### Debugging Self-Hosted Trigger.dev

**Check service status via Coolify API:**
```bash
curl -s "https://app.coolify.io/api/v1/services/<uuid>" \
  -H "Authorization: Bearer <token>" | python3 -m json.tool
```

**Check supervisor logs:**
```bash
# In Coolify dashboard: Service → supervisor container → Logs
# Or via SSH:
docker logs supervisor-<coolify-uuid> --tail 50
```

**Common errors and fixes:**

| Error | Cause | Fix |
|-------|-------|-----|
| `Invalid or missing worker token` | Wrong TRIGGER_WORKER_TOKEN | Set to `file:///home/node/shared/worker_token` |
| `Failed to connect` | Supervisor can't reach webapp | Check TRIGGER_API_URL and Docker networking |
| Runs stuck in `queued` | Supervisor not running | Check supervisor container status |
| Runs stuck in `dequeued` | Workers can't spawn | Check DOCKER_RUNNER_NETWORKS and docker-proxy |
| `DOCKER_RUNNER_NETWORKS` empty | Coolify null resolution | Set explicitly to Coolify network name |

**Verify runs are executing:**
```bash
# Via Trigger.dev MCP
npx trigger.dev@latest mcp --api-url https://your-trigger.com
# Then use list_runs tool to check run statuses
```

---

## Best Practices for Agentic Workflows

### 1. Design Tasks to Be Idempotent
If a task is retried, it should produce the same result. Use idempotency keys for side effects.

```ts
import { idempotencyKeys } from "@trigger.dev/sdk";

const key = await idempotencyKeys.create(`send-email-${userId}-${date}`);
await sendEmail.trigger(payload, { idempotencyKey: key });
```

### 2. Use Metadata for Observability
Track agent state, tool calls, and decision points in metadata so you can monitor from the UI.

### 3. Fan-Out with Batch, Not Promise.all
```ts
// GOOD: Trigger.dev manages parallelism
const results = await childTask.batchTriggerAndWait(items);

// BAD: Breaks Trigger.dev's execution model
const results = await Promise.all(items.map(i => childTask.triggerAndWait(i)));
```

### 4. Use Queues for Rate Limiting
Protect external APIs with concurrency limits.

```ts
import { queue } from "@trigger.dev/sdk";

const apiQueue = queue({ name: "openai-calls", concurrencyLimit: 5 });

export const aiTask = task({
  id: "ai-call",
  queue: apiQueue,
  run: async (payload) => { /* ... */ },
});
```

### 5. Use Tags for Multi-Tenant Tracking
```ts
await myTask.trigger(payload, {
  tags: [`user_${userId}`, `org_${orgId}`],
});

// Subscribe to all runs for a user
for await (const run of runs.subscribeToRunsWithTag(`user_${userId}`)) {
  // Real-time updates for this user's tasks
}
```

### 6. Graceful Error Handling
Distinguish between retryable and fatal errors.

```ts
import { AbortTaskRunError } from "@trigger.dev/sdk";

export const paymentTask = task({
  id: "charge-customer",
  run: async (payload) => {
    try {
      return await stripe.charges.create(payload);
    } catch (error) {
      if (error.code === "card_declined") {
        // Don't retry — card is declined
        throw new AbortTaskRunError("Card declined");
      }
      // Other errors will be retried automatically
      throw error;
    }
  },
});
```

---

## Quick Reference

| Concept | Import | Usage |
|---------|--------|-------|
| Define a task | `task` from `@trigger.dev/sdk` | `export const myTask = task({ id, run })` |
| Define a scheduled task | `schedules` from `@trigger.dev/sdk` | `schedules.task({ id, cron, run })` |
| Trigger from backend | `tasks` from `@trigger.dev/sdk` | `tasks.trigger("task-id", payload)` |
| Trigger and wait | Direct import | `myTask.triggerAndWait(payload)` |
| Track progress | `metadata` from `@trigger.dev/sdk` | `metadata.set("progress", 50)` |
| Rate limit | `queue` from `@trigger.dev/sdk` | `queue({ name, concurrencyLimit })` |
| Realtime (React) | `useRealtimeRun` from `@trigger.dev/react-hooks` | `useRealtimeRun(runId, { accessToken })` |
| Auth token | `auth` from `@trigger.dev/sdk` | `auth.createPublicToken({ scopes })` |
| Wait/pause | `wait` from `@trigger.dev/sdk` | `await wait.for({ minutes: 5 })` |
| Logging | `logger` from `@trigger.dev/sdk` | `logger.info("message", { data })` |
