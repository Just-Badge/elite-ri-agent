/**
 * Shared Redis connection configuration for BullMQ.
 *
 * All queues and workers use these connection settings. Redis URL is
 * provided via REDIS_URL environment variable (defaults to localhost
 * for local development).
 *
 * IMPORTANT: BullMQ requires maxRetriesPerRequest: null for workers
 * (blocking connections) and a small number for API routes (fail fast).
 */

import type { RedisOptions } from "ioredis";

function parseRedisUrl(url: string): RedisOptions {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: parseInt(parsed.port || "6379", 10),
    password: parsed.password || undefined,
    username: parsed.username || undefined,
    ...(parsed.protocol === "rediss:" ? { tls: {} } : {}),
  };
}

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

/** Connection for workers (blocking — must set maxRetriesPerRequest: null) */
export const workerConnection: RedisOptions = {
  ...parseRedisUrl(redisUrl),
  maxRetriesPerRequest: null,
  enableOfflineQueue: true,
};

/** Connection for queues/API routes (non-blocking — fail fast) */
export const queueConnection: RedisOptions = {
  ...parseRedisUrl(redisUrl),
  maxRetriesPerRequest: 2,
  enableOfflineQueue: false,
};
