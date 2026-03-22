/**
 * Queue definitions for the Elite RI Agent.
 *
 * All queues are defined here so they can be imported by both
 * API routes (to enqueue jobs) and the worker process (to process them).
 *
 * Queue prefix "elite-ri:" ensures isolation when sharing Redis
 * with other apps on the same instance.
 */

import { Queue } from "bullmq";
import { queueConnection } from "./connection";

const PREFIX = "elite-ri";

/** Meeting sync pipeline: dispatcher → per-user sync → per-meeting enrichment */
export const meetingQueue = new Queue(`${PREFIX}:meetings`, {
  connection: queueConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
    removeOnComplete: { age: 7 * 24 * 3600, count: 500 },
    removeOnFail: { age: 30 * 24 * 3600, count: 1000 },
  },
});

/** Outreach draft generation pipeline */
export const outreachQueue = new Queue(`${PREFIX}:outreach`, {
  connection: queueConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
    removeOnComplete: { age: 7 * 24 * 3600, count: 500 },
    removeOnFail: { age: 30 * 24 * 3600, count: 1000 },
  },
});

/** Maintenance tasks: token keepalive, cleanup, etc. */
export const maintenanceQueue = new Queue(`${PREFIX}:maintenance`, {
  connection: queueConnection,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: "fixed", delay: 5000 },
    removeOnComplete: { age: 24 * 3600, count: 100 },
    removeOnFail: { age: 7 * 24 * 3600, count: 200 },
  },
});

/** All queues for Bull Board registration */
export const allQueues = [meetingQueue, outreachQueue, maintenanceQueue];
