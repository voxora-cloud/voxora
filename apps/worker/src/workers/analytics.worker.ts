import { Worker, ConnectionOptions } from "bullmq";
import mongoose, { Schema } from "mongoose";
import config from "../config";
import logger from "../utils/logger";

export const ANALYTICS_QUEUE = "platform-analytics";

export interface AnalyticsJobData {
  event: string;
  organizationId: string;
  category: "ai" | "agent" | "system";
  metadata?: Record<string, any>;
  conversationId?: string;
  userId?: string;
  agentId?: string;
  widgetId?: string;
  channel?: "widget" | "web" | "mobile" | "api" | "qr";
  occurredAt?: string | Date;
  eventVersion?: string;
}

// ── Config ────────────────────────────────────────────────────────────────────
const BATCH_SIZE = 25;
const FLUSH_INTERVAL_MS = 15_000; // flush at least every 5s regardless of batch size

// ── In-memory event buffer ────────────────────────────────────────────────────
interface BufferedEvent {
  organizationId: string;
  type: string;
  category: string;
  metadata: Record<string, any>;
  conversationId?: string;
  userId?: string;
  agentId?: string;
  widgetId?: string;
  channel?: string;
  eventVersion?: string;
  occurredAt?: Date;
  createdAt: Date;
}

const eventBuffer: BufferedEvent[] = [];

// ── Minimal inline schema ─────────────────────────────────────────────────────
function getModels() {
  const AnalyticsEvent =
    mongoose.models["AnalyticsEvent"] ||
    mongoose.model(
      "AnalyticsEvent",
      new Schema(
        {
          organizationId: { type: String, required: true, index: true },
          conversationId: { type: String, index: true },
          userId: { type: String, index: true },
          agentId: { type: String, index: true },
          widgetId: { type: String, index: true },
          channel: { type: String, enum: ["widget", "web", "mobile", "api", "qr"] },
          eventVersion: { type: String, default: "1" },
          type: { type: String, required: true, index: true },
          category: { type: String, required: true, enum: ["ai", "agent", "system"], index: true },
          metadata: { type: Schema.Types.Mixed, default: {} },
          occurredAt: { type: Date, default: Date.now, index: true },
        },
        { timestamps: { createdAt: true, updatedAt: false } }
      )
    );
  return { AnalyticsEvent };
}

// ── DB connection ─────────────────────────────────────────────────────────────
async function connectDb(): Promise<void> {
  if (mongoose.connection.readyState === 1) return;
  await mongoose.connect(config.database.mongoUri);
}

// ── Flush buffer to MongoDB ───────────────────────────────────────────────────
async function flushBuffer(): Promise<void> {
  if (eventBuffer.length === 0) return;

  // Drain the buffer atomically to avoid race conditions with the interval
  const batch = eventBuffer.splice(0, eventBuffer.length);

  try {
    await connectDb();
    const { AnalyticsEvent } = getModels();
    await AnalyticsEvent.insertMany(batch, { ordered: false });
    logger.info("Analytics events flushed", {
      count: batch.length,
      bufferSize: eventBuffer.length,
    });
  } catch (err: any) {
    logger.error("Analytics bulk insert failed", {
      count: batch.length,
      bufferSize: eventBuffer.length,
      error: err,
    });
    // Push failed events back to the front of the buffer so they're retried next flush
    eventBuffer.unshift(...batch);
  }
}

// ── Worker ────────────────────────────────────────────────────────────────────
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
      const {
        event,
        organizationId,
        category,
        metadata,
        conversationId,
        userId,
        agentId,
        widgetId,
        channel,
        occurredAt,
        eventVersion,
      } = job.data;

      const occurred = occurredAt ? new Date(occurredAt) : new Date();

      eventBuffer.push({
        organizationId,
        type: event,
        category,
        metadata: metadata || {},
        conversationId,
        userId,
        agentId,
        widgetId,
        channel,
        eventVersion: eventVersion || "1",
        occurredAt: occurred,
        createdAt: new Date(),
      });

      logger.debug("Analytics event buffered", {
        jobId: job.id,
        event,
        organizationId,
        conversationId,
        channel,
        bufferSize: eventBuffer.length,
        batchSize: BATCH_SIZE,
      });

      // Flush immediately once batch size is reached
      if (eventBuffer.length >= BATCH_SIZE) {
        await flushBuffer();
      }
    },
    { connection, concurrency: config.worker.concurrency },
  );

  // Periodic flush — ensures events don't sit in the buffer forever in low-traffic periods
  const flushTimer = setInterval(() => {
    flushBuffer().catch((err) =>
      logger.error("Analytics periodic flush failed", { error: err }),
    );
  }, FLUSH_INTERVAL_MS);

  worker.on("completed", (job) =>
    logger.debug("Analytics job accepted", {
      jobId: job.id,
      queue: ANALYTICS_QUEUE,
      event: job.data.event,
      organizationId: job.data.organizationId,
    }),
  );
  worker.on("failed", (job, err) =>
    logger.error("Analytics job failed", {
      jobId: job?.id,
      queue: ANALYTICS_QUEUE,
      event: job?.data.event,
      organizationId: job?.data.organizationId,
      error: err,
    }),
  );
  worker.on("error", (err) =>
    logger.error("Analytics worker error", { queue: ANALYTICS_QUEUE, error: err }),
  );

  // Clean up the interval timer on graceful shutdown
  worker.on("closing", () => clearInterval(flushTimer));

  logger.info("Analytics worker started", {
    queue: ANALYTICS_QUEUE,
    batchSize: BATCH_SIZE,
    flushIntervalMs: FLUSH_INTERVAL_MS,
    concurrency: config.worker.concurrency,
  });

  return worker;
}
