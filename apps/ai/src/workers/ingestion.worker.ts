import { Worker, Queue, ConnectionOptions } from "bullmq";
import config from "../config";
import { DocumentJob } from "../modules/ingestion/ingestion.types";
import { runIngestionPipeline } from "../modules/ingestion/pipelines/file.pipeline";
import { runUrlIngestionPipeline } from "../modules/ingestion/pipelines/url.pipeline";
import { runTextIngestionPipeline } from "../modules/ingestion/pipelines/text.pipeline";
import { vectorStore } from "../infrastructure/vector";
import { buildKnowledgeLookupFilter, connectDB, KnowledgeModel } from "../shared/db/db";

export const INGESTION_QUEUE = "document-ingestion";

/** Milliseconds between re-crawls per syncFrequency option */
const SYNC_DELAYS: Record<string, number> = {
  "1hour": 1 * 60 * 60 * 1000,
  "6hours": 6 * 60 * 60 * 1000,
  "daily": 24 * 60 * 60 * 1000,
};

export function startIngestionWorker() {
  const connection: ConnectionOptions = {
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password,
    maxRetriesPerRequest: null,
  };

  // Separate queue instance used only for self-scheduling URL re-crawl jobs
  const ingestionQueue = new Queue<DocumentJob>(INGESTION_QUEUE, {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 1000 },
      removeOnComplete: 100,
      removeOnFail: 50,
    },
  });

  const worker = new Worker<DocumentJob, void, string>(
    INGESTION_QUEUE,
    async (job) => {
      const { source, jobType } = job.data;

      // Delete-vectors: remove all Qdrant points for this document and stop
      if (jobType === "delete-vectors") {
        await vectorStore.deleteByDocumentId(job.data.documentId, job.data.organizationId);
        console.log(
          `[Ingestion Worker] Deleted Qdrant vectors for documentId=${job.data.documentId}`,
        );
        return;
      }

      await connectDB();
      const currentDoc = await (KnowledgeModel as any).findOne(
        buildKnowledgeLookupFilter(job.data.documentId),
        { version: 1 },
      );

      if (!currentDoc) {
        console.log(
          `[Ingestion Worker] Document missing, skipping job ${job.id} for documentId=${job.data.documentId}`,
        );
        return;
      }

      const jobVersion = job.data.version ?? 1;
      const currentVersion =
        typeof currentDoc.version === "number" ? currentDoc.version : 1;

      if (jobVersion < currentVersion) {
        console.log(
          `[Ingestion Worker] Skipping stale job ${job.id} for documentId=${job.data.documentId} (jobVersion=${jobVersion}, currentVersion=${currentVersion})`,
        );
        return;
      }

      if (source === "url") {
        await runUrlIngestionPipeline(job.data);
        return;
      }

      if (source === "text" || source === "table") {
        await runTextIngestionPipeline(job.data);
        return;
      }

      // pdf / docx
      await runIngestionPipeline(job.data);
    },
    {
      connection,
      concurrency: config.worker.ingestionConcurrency,
    },
  );

  worker.on("completed", async (job) => {
    console.log(`[Ingestion Worker] Job ${job.id} completed`);

    // Self-schedule URL re-crawl based on syncFrequency (skip for delete-vectors jobs)
    if (
      job.data.jobType !== "delete-vectors" &&
      job.data.source === "url" &&
      job.data.syncFrequency
    ) {
      const delay = SYNC_DELAYS[job.data.syncFrequency];
      if (delay) {
        // Check isPaused flag in MongoDB before scheduling — user may have paused
        // the source while a crawl was already in flight.
        await connectDB();
        const doc = await (KnowledgeModel as any).findOne(
          buildKnowledgeLookupFilter(job.data.documentId),
          { isPaused: 1, version: 1 },
        );

        // Document was deleted — skip re-scheduling
        if (!doc) {
          console.log(
            `[Ingestion Worker] Document deleted, skipping re-crawl for documentId=${job.data.documentId}`,
          );
          return;
        }

        // Source was paused while the crawl was in flight — skip re-scheduling
        if (doc.isPaused) {
          console.log(
            `[Ingestion Worker] Source is paused, skipping re-crawl schedule for documentId=${job.data.documentId}`,
          );
          return;
        }

        const latestVersion =
          typeof doc.version === "number" ? doc.version : job.data.version ?? 1;

        await ingestionQueue.add(
          "ingest",
          { ...job.data, version: latestVersion },
          {
            delay,
            jobId: job.data.documentId,
            removeOnComplete: true,
          },
        );
        console.log(
          `[Ingestion Worker] Re-crawl scheduled in ${delay / 60_000} min for ${job.data.sourceUrl}`,
        );
      }
    }
  });
  worker.on("failed", (job, err) =>
    console.error(`[Ingestion Worker] Job ${job?.id} failed:`, err.message),
  );
  worker.on("error", (err) =>
    console.error("[Ingestion Worker] Worker error:", err),
  );

  console.log(
    `[Ingestion Worker] Started, listening on BullMQ queue: "${INGESTION_QUEUE}"`,
  );
  return worker;
}