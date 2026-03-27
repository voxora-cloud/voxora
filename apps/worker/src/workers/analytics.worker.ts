import { Worker, ConnectionOptions } from "bullmq";
import config from "../config";

export const ANALYTICS_QUEUE = "platform:analytics";

export interface AnalyticsJobData {
  event: string;
  organizationId: string;
  userId?: string;
  conversationId?: string;
  metadata?: Record<string, unknown>;
  timestamp?: string;
}

export function startAnalyticsWorker() {
  const connection: ConnectionOptions = {
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password,
    maxRetriesPerRequest: null,
  };

  const worker = new Worker<AnalyticsJobData, void, string>(
    ANALYTICS_QUEUE,
    async (job) => {
      const { event, organizationId, userId, conversationId, metadata, timestamp } = job.data;
      console.log(
        `[Analytics Worker] Event: "${event}" | org: ${organizationId}${userId ? ` | user: ${userId}` : ""}${conversationId ? ` | conv: ${conversationId}` : ""} | time: ${timestamp ?? new Date().toISOString()}`,
        metadata ?? {},
      );
    },
    { connection, concurrency: config.worker.concurrency },
  );

  worker.on("completed", (job) =>
    console.log(`[Analytics Worker] Job ${job.id} processed — event: "${job.data.event}"`),
  );
  worker.on("failed", (job, err) =>
    console.error(`[Analytics Worker] Job ${job?.id} failed:`, err.message),
  );
  worker.on("error", (err) =>
    console.error("[Analytics Worker] Worker error:", err),
  );

  console.log(`[Analytics Worker] Started. Queue: "${ANALYTICS_QUEUE}"`);
  return worker;
}
