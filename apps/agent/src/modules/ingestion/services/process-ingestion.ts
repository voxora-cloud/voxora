import pLimit from "p-limit";
import {
  ProviderFactory,
  EmbeddingProvider,
} from "../../../infrastructure/providers";
import { vectorStore } from "../../../infrastructure/vector";
import { chunkText } from "../utils/chunker";
import { generateDeterministicChunkId } from "../../../shared/id";
import {
  ContentStreamItem,
  ProcessIngestionInput,
  ProcessIngestionResult,
} from "../ingestion.types";

const DEFAULT_BATCH_SIZE = parseInt(process.env.INGEST_BATCH_SIZE || "25", 10);
const DEFAULT_FLUSH_MS = parseInt(process.env.INGEST_FLUSH_MS || "5000", 10);
const DEFAULT_EMBED_CONCURRENCY = parseInt(
  process.env.INGEST_EMBED_CONCURRENCY || "5",
  10,
);
const DEFAULT_EMBED_RETRIES = parseInt(
  process.env.INGEST_EMBED_RETRIES || "3",
  10,
);
const DEFAULT_RETRY_BASE_MS = parseInt(
  process.env.INGEST_RETRY_BASE_MS || "400",
  10,
);

interface PendingChunk {
  deterministicId: string;
  text: string;
  payload: {
    organizationId: string;
    documentId: string;
    fileKey: string;
    fileName: string;
    chunkIndex: number;
    text: string;
    [key: string]: unknown;
  };
}

function logEvent(event: string, payload: Record<string, unknown>): void {
  console.log(
    JSON.stringify({
      ts: new Date().toISOString(),
      component: "ingestion-engine",
      event,
      ...payload,
    }),
  );
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function embedWithRetry(params: {
  text: string;
  maxRetries: number;
  retryBaseMs: number;
  provider: EmbeddingProvider;
  trace: Record<string, unknown>;
}): Promise<number[]> {
  const { text, maxRetries, retryBaseMs, provider, trace } = params;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      const orgId =
        typeof trace.organizationId === "string"
          ? trace.organizationId
          : undefined;
      return await provider.embed(text, { organizationId: orgId });
    } catch (error: any) {
      const lastAttempt = attempt >= maxRetries;
      if (lastAttempt) {
        throw error;
      }

      const delay = retryBaseMs * 2 ** attempt + Math.floor(Math.random() * 50);
      logEvent("embed.retry", {
        ...trace,
        attempt: attempt + 1,
        retryInMs: delay,
        error: error?.message || String(error),
      });
      await wait(delay);
    }
  }

  throw new Error("Embedding retry loop exited unexpectedly");
}

export async function processIngestion(
  input: ProcessIngestionInput,
): Promise<ProcessIngestionResult> {
  const startedAt = Date.now();
  const batchSize = input.batchSize ?? DEFAULT_BATCH_SIZE;
  const flushMs = input.flushMs ?? DEFAULT_FLUSH_MS;
  const embedRetries = input.embedRetries ?? DEFAULT_EMBED_RETRIES;
  const retryBaseMs = input.retryBaseMs ?? DEFAULT_RETRY_BASE_MS;
  const embeddingConcurrency =
    input.embeddingConcurrency ?? DEFAULT_EMBED_CONCURRENCY;

  const provider = ProviderFactory.getEmbeddingProvider();
  const capabilities = await provider.getCapabilities();
  const dimensions = capabilities.embeddingDimensions || provider.dimensions;
  const limit = pLimit(Math.max(1, embeddingConcurrency));

  logEvent("ingestion.start", {
    organizationId: input.organizationId,
    documentId: input.documentId,
    batchSize,
    flushMs,
    embeddingConcurrency,
    embedRetries,
    provider: provider.name,
    providerDimensions: dimensions,
  });

  await vectorStore.ensureCollection(dimensions);
  await vectorStore.deleteByDocumentId(input.documentId, input.organizationId);

  let unitsProcessed = 0;
  let chunksTotal = 0;
  let chunksSucceeded = 0;
  let chunksFailed = 0;
  let wordCount = 0;
  let nextChunkIndex = 0;
  let batchNumber = 0;

  let pending: PendingChunk[] = [];
  let flushTimer: ReturnType<typeof setTimeout> | null = null;
  let flushInFlight: Promise<void> | null = null;
  let asyncFlushError: unknown = null;

  const clearFlushTimer = () => {
    if (!flushTimer) return;
    clearTimeout(flushTimer);
    flushTimer = null;
  };

  const flush = async (reason: "batch-size" | "timeout" | "final") => {
    clearFlushTimer();
    if (pending.length === 0) return;

    batchNumber += 1;
    const currentBatch = pending;
    pending = [];

    const batchStart = Date.now();
    logEvent("batch.start", {
      organizationId: input.organizationId,
      documentId: input.documentId,
      batchNumber,
      batchSize: currentBatch.length,
      reason,
    });

    const settled = await Promise.allSettled(
      currentBatch.map((chunk) =>
        limit(async () => {
          const vector = await embedWithRetry({
            text: chunk.text,
            maxRetries: embedRetries,
            retryBaseMs,
            provider,
            trace: {
              organizationId: input.organizationId,
              documentId: input.documentId,
              batchNumber,
              chunkId: chunk.deterministicId,
            },
          });
          return {
            id: chunk.deterministicId,
            vector,
            payload: chunk.payload,
          };
        }),
      ),
    );

    const upsertPoints: Array<{
      id: string;
      vector: number[];
      payload: PendingChunk["payload"];
    }> = [];

    for (let i = 0; i < settled.length; i += 1) {
      const result = settled[i];
      if (result.status === "fulfilled") {
        chunksSucceeded += 1;
        upsertPoints.push(result.value);
      } else {
        chunksFailed += 1;
        const failedChunk = currentBatch[i];
        logEvent("chunk.failed", {
          organizationId: input.organizationId,
          documentId: input.documentId,
          batchNumber,
          chunkId: failedChunk.deterministicId,
          sourceRef: failedChunk.payload.sourceRef,
          error:
            result.reason instanceof Error
              ? result.reason.message
              : String(result.reason),
        });
      }
    }

    if (upsertPoints.length > 0) {
      try {
        await vectorStore.upsert(upsertPoints);
      } catch (error: any) {
        logEvent("batch.upsert.failed", {
          organizationId: input.organizationId,
          documentId: input.documentId,
          batchNumber,
          upsertedAttempted: upsertPoints.length,
          sampleId: upsertPoints[0]?.id,
          error: error?.message || String(error),
          details: error?.response?.data || undefined,
        });
        throw error;
      }
    }

    logEvent("batch.finish", {
      organizationId: input.organizationId,
      documentId: input.documentId,
      batchNumber,
      upserted: upsertPoints.length,
      failed: currentBatch.length - upsertPoints.length,
      reason,
      durationMs: Date.now() - batchStart,
    });
  };

  const flushSequentially = async (
    reason: "batch-size" | "timeout" | "final",
  ) => {
    if (flushInFlight) {
      await flushInFlight;
    }

    const promise = flush(reason);
    flushInFlight = promise;

    try {
      await promise;
    } finally {
      if (flushInFlight === promise) {
        flushInFlight = null;
      }
    }
  };

  const scheduleFlush = () => {
    if (flushMs <= 0 || pending.length === 0 || flushTimer) return;

    flushTimer = setTimeout(() => {
      flushTimer = null;
      flushSequentially("timeout").catch((error: any) => {
        asyncFlushError = error;
        logEvent("batch.flush.timeout.failed", {
          organizationId: input.organizationId,
          documentId: input.documentId,
          error: error?.message || String(error),
        });
      });
    }, flushMs);
  };

  for await (const unit of input.contentStream) {
    if (asyncFlushError) throw asyncFlushError;
    if (!unit.text.trim()) continue;

    unitsProcessed += 1;
    wordCount += unit.text.trim().split(/\s+/).length;

    const chunks = chunkText(unit.text, input.chunkSize, input.chunkOverlap);

    for (const chunk of chunks) {
      const chunkIndex = nextChunkIndex;
      const deterministicId = generateDeterministicChunkId({
        organizationId: input.organizationId,
        documentId: input.documentId,
        sourceRef: unit.sourceRef,
        chunkIndex,
      });

      pending.push({
        deterministicId,
        text: chunk.text,
        payload: {
          organizationId: input.organizationId,
          documentId: input.documentId,
          fileKey: input.fileKey || "",
          fileName: input.fileName || "",
          chunkIndex,
          text: chunk.text,
          sourceRef: unit.sourceRef,
          ...(input.metadata || {}),
          ...(unit.metadata || {}),
        },
      });

      chunksTotal += 1;
      nextChunkIndex += 1;

      if (pending.length >= batchSize) {
        await flushSequentially("batch-size");
      } else {
        scheduleFlush();
      }
    }

    if (unitsProcessed % 20 === 0) {
      logEvent("progress.units", {
        organizationId: input.organizationId,
        documentId: input.documentId,
        unitsProcessed,
        chunksTotal,
        chunksSucceeded,
        chunksFailed,
      });
    }
  }

  if (asyncFlushError) throw asyncFlushError;
  await flushSequentially("final");
  if (asyncFlushError) throw asyncFlushError;

  if (chunksTotal === 0) {
    throw new Error("No ingestible content was produced from source stream");
  }
  if (chunksSucceeded === 0) {
    throw new Error("All chunk embeddings failed");
  }

  const result: ProcessIngestionResult = {
    unitsProcessed,
    chunksTotal,
    chunksSucceeded,
    chunksFailed,
    wordCount,
    durationMs: Date.now() - startedAt,
  };

  logEvent("ingestion.finish", {
    organizationId: input.organizationId,
    documentId: input.documentId,
    ...result,
  });

  return result;
}
