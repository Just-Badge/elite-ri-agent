/**
 * Queue definitions for the Elite RI Agent.
 *
 * All queues are defined here so they can be imported by both
 * API routes (to enqueue jobs) and the worker process (to process them).
 *
 * Queue prefix "elite-ri-" ensures isolation when sharing Redis
 * with other apps on the same instance.
 * NOTE: BullMQ does NOT allow colons in queue names (used internally as delimiter).
 *
 * Queues are lazily instantiated to avoid connecting to Redis during
 * Next.js build (when REDIS_URL may not be available).
 */

import { Queue } from "bullmq";
import { queueConnection } from "./connection";

const PREFIX = "elite-ri";

const defaultJobOptions = {
  attempts: 3,
  backoff: { type: "exponential" as const, delay: 2000 },
  removeOnComplete: { age: 7 * 24 * 3600, count: 500 },
  removeOnFail: { age: 30 * 24 * 3600, count: 1000 },
};

function createQueue(name: string, opts?: Record<string, unknown>) {
  return new Queue(`${PREFIX}-${name}`, {
    connection: queueConnection,
    defaultJobOptions: { ...defaultJobOptions, ...opts },
  });
}

// Lazy singletons — only created when first accessed at runtime
let _meetingQueue: Queue | null = null;
let _outreachQueue: Queue | null = null;
let _maintenanceQueue: Queue | null = null;

/** Meeting sync pipeline: dispatcher → per-user sync → per-meeting enrichment */
export function getMeetingQueue(): Queue {
  if (!_meetingQueue) _meetingQueue = createQueue("meetings");
  return _meetingQueue;
}

/** Outreach draft generation pipeline */
export function getOutreachQueue(): Queue {
  if (!_outreachQueue) _outreachQueue = createQueue("outreach");
  return _outreachQueue;
}

/** Maintenance tasks: token keepalive, cleanup, etc. */
export function getMaintenanceQueue(): Queue {
  if (!_maintenanceQueue) {
    _maintenanceQueue = createQueue("maintenance", {
      attempts: 2,
      backoff: { type: "fixed" as const, delay: 5000 },
      removeOnComplete: { age: 24 * 3600, count: 100 },
      removeOnFail: { age: 7 * 24 * 3600, count: 200 },
    });
  }
  return _maintenanceQueue;
}

/** All queues for Bull Board registration (only call at runtime) */
export function getAllQueues(): Queue[] {
  return [getMeetingQueue(), getOutreachQueue(), getMaintenanceQueue()];
}

// Direct exports for the worker (which always has Redis available)
export const meetingQueue = { get: getMeetingQueue };
export const outreachQueue = { get: getOutreachQueue };
export const maintenanceQueue = { get: getMaintenanceQueue };
