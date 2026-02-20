import { Worker, ConnectionOptions } from "bullmq";
import config from "../config";
import { DocumentJob } from "./types";
import { runIngestionPipeline } from "./pipeline";

export const INGESTION_QUEUE = "document-ingestion";

export function startIngestionWorker() {
  const connection: ConnectionOptions = {
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password,
    maxRetriesPerRequest: null,
  };

  const worker = new Worker<DocumentJob, void, string>(
    INGESTION_QUEUE,
    async (job) => {
      const { source, documentId, sourceUrl, fileName } = job.data;

      if (source === "url") {
        // TODO: fetch URL content → chunk → embed → Qdrant
        console.log(`[Ingestion Worker] [URL] Job ${job.id} — queued for URL ingestion`);
        console.log(`  documentId : ${documentId}`);
        console.log(`  sourceUrl  : ${sourceUrl}`);
        console.log(`  fileName   : ${fileName}`);
        return;
      }

      if (source === "text") {
        // TODO: chunk text → embed → Qdrant
        console.log(`[Ingestion Worker] [TEXT] Job ${job.id} — queued for text ingestion`);
        console.log(`  documentId : ${documentId}`);
        console.log(`  fileName   : ${fileName}`);
        console.log(`  contentLen : ${job.data.content?.length ?? 0} chars`);
        return;
      }

      // pdf / docx — full pipeline already implemented
      console.log(`[Ingestion Worker] [${source.toUpperCase()}] Job ${job.id} — running pipeline`);
      await runIngestionPipeline({
        ...job.data,
        teamId: job.data.teamId ?? "",
      });
    },
    {
      connection,
      concurrency: config.worker.ingestionConcurrency,
    },
  );

  worker.on("completed", (job) =>
    console.log(`[Ingestion Worker] Job ${job.id} completed`),
  );
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
