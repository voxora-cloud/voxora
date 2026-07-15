import { Queue, Job } from "bullmq";
import { DocumentJob } from "../modules/ingestion/ingestion.types";
import { cacheRedis } from "../infrastructure/cache/redis.client";
import { InternalApiService } from "../infrastructure/api/internal-api.service";
import logger from "./logger";

const URL_LOCK_TTL_SECONDS = parseInt(
  process.env.URL_INGEST_LOCK_TTL_SECONDS || "3600",
  10,
);
const LOCK_RETRY_DELAY_MS = 60_000;

/**
 * Attempt to acquire an exclusive lock for URL ingestion.
 * If the lock is already held, schedules a retry job in BullMQ.
 * Returns true if the lock was acquired, false otherwise.
 */
export async function acquireUrlLock(
  ingestionQueue: Queue<DocumentJob>,
  job: Job<DocumentJob>,
): Promise<boolean> {
  const lockKey = `ingestion:url:lock:${job.data.documentId}`;
  const lockValue = job.id ?? "1";

  const lockAcquired = await cacheRedis.set(
    lockKey,
    lockValue,
    "EX",
    URL_LOCK_TTL_SECONDS,
    "NX",
  );

  if (!lockAcquired) {
    const retryJobId = `ingest-lock-retry:${job.data.documentId}`;
    try {
      await ingestionQueue.add("ingest", job.data, {
        delay: LOCK_RETRY_DELAY_MS,
        jobId: retryJobId,
        removeOnComplete: true,
        removeOnFail: true,
      });
    } catch (err: any) {
      logger.warn("URL ingestion lock retry already scheduled", {
        jobId: job.id,
        documentId: job.data.documentId,
        organizationId: job.data.organizationId,
        error: err,
      });
    }
    logger.info("URL ingestion skipped due to active lock", {
      jobId: job.id,
      documentId: job.data.documentId,
      organizationId: job.data.organizationId,
    });
    return false;
  }

  return true;
}

/**
 * Release the URL ingestion lock.
 */
export async function releaseUrlLock(documentId: string): Promise<void> {
  const lockKey = `ingestion:url:lock:${documentId}`;
  await cacheRedis.del(lockKey).catch(() => undefined);
}
