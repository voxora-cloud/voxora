import { Worker, Queue } from "bullmq";
import { getBullMQConnection } from "../infrastructure/queue/bullmq.client";
import { AI_OBSERVABILITY_QUEUE } from "../infrastructure/providers/observability/observability.queue";
import { AICallEvent } from "../infrastructure/providers/types/ai.types";
import { internalApi } from "../infrastructure/api/internal.client";
import logger from "../utils/logger";

/**
 * How many events to accumulate before flushing to MongoDB.
 * Override with AI_OBS_BATCH_SIZE env var.
 */
const BATCH_SIZE = parseInt(process.env.AI_OBS_BATCH_SIZE || "50", 10);

/**
 * Max time to wait before flushing a partial batch (ms).
 * Override with AI_OBS_FLUSH_MS env var.
 */
const FLUSH_MS = parseInt(process.env.AI_OBS_FLUSH_MS || "10000", 10);

export function startObservabilityWorker() {
  const connection = getBullMQConnection();
  const batch: AICallEvent[] = [];
  let flushTimer: ReturnType<typeof setTimeout> | null = null;

  const flush = async () => {
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
    if (batch.length === 0) return;

    const events = batch.splice(0, batch.length);

    try {
      await internalApi.post("/observability/ai-calls", { events });
      logger.info("[ObservabilityWorker] Flushed AI call events", {
        count: events.length,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      // Log but don't crash — observability failures must not affect the service
      logger.warn("[ObservabilityWorker] Failed to flush events", {
        count: events.length,
        error: message,
      });
    }
  };

  const scheduleFlush = () => {
    if (flushTimer) return;
    flushTimer = setTimeout(() => {
      flush().catch(() => undefined);
    }, FLUSH_MS);
  };

  const worker = new Worker<AICallEvent>(
    AI_OBSERVABILITY_QUEUE,
    async (job) => {
      batch.push(job.data);

      if (batch.length >= BATCH_SIZE) {
        await flush();
      } else {
        scheduleFlush();
      }
    },
    {
      connection,
      concurrency: 1, // Single consumer to keep batch ordering
    },
  );

  worker.on("failed", (job, err) => {
    logger.warn("[ObservabilityWorker] Job failed", {
      jobId: job?.id,
      error: err.message,
    });
  });

  worker.on("error", (err) => {
    logger.error("[ObservabilityWorker] Worker error", {
      queue: AI_OBSERVABILITY_QUEUE,
      error: err,
    });
  });

  logger.info("[ObservabilityWorker] Started", {
    queue: AI_OBSERVABILITY_QUEUE,
    batchSize: BATCH_SIZE,
    flushMs: FLUSH_MS,
  });

  return { worker, flush };
}
