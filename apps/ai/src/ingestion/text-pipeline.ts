import { randomUUID } from "crypto";
import { DocumentJob } from "./types";
import { chunkText } from "./chunker";
import { getEmbeddingProvider, vectorStore } from "../embeddings";
import { setDocStatus } from "./db";

/**
 * Plain-text ingestion pipeline:
 *   1. status → "indexing"
 *   2. Chunk the raw content string
 *   3. Embed chunks in batches
 *   4. Upsert into Qdrant (idempotent)
 *   5. status → "indexed"
 */
export async function runTextIngestionPipeline(job: DocumentJob): Promise<void> {
  const {
    documentId,
    content = "",
    teamId = "",
    fileName,
    metadata = {},
  } = job;

  if (!content.trim()) {
    await setDocStatus(documentId, {
      status: "failed",
      errorMessage: "Content is empty",
    });
    return;
  }

  await setDocStatus(documentId, { status: "indexing" });
  console.log(`[Text Ingestion] Starting: ${fileName}`);

  try {
    // ── Chunk ─────────────────────────────────────────────────────────────────
    const chunks = chunkText(content);
    console.log(`[Text Ingestion] ${chunks.length} chunks from ${fileName}`);

    // ── Embed + upsert ────────────────────────────────────────────────────────
    const provider = getEmbeddingProvider();
    await vectorStore.ensureCollection(provider.dimensions);
    await vectorStore.deleteByDocumentId(documentId);

    const BATCH_SIZE = 25;

    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE);

      const points = await Promise.all(
        batch.map(async (chunk) => {
          const vector = await provider.embed(chunk.text);
          return {
            id: randomUUID(),
            vector,
            payload: {
              documentId,
              teamId,
              fileKey: "",
              fileName,
              chunkIndex: chunk.index,
              text: chunk.text,
              ...metadata,
            },
          };
        }),
      );

      await vectorStore.upsert(points);
    }

    // ── Mark done ─────────────────────────────────────────────────────────────
    await setDocStatus(documentId, {
      status: "indexed",
      wordCount: content.split(/\s+/).length,
      chunkCount: chunks.length,
      lastIndexed: new Date(),
    });

    console.log(
      `[Text Ingestion] Done: ${chunks.length} chunks for document ${documentId}`,
    );
  } catch (err: any) {
    await setDocStatus(documentId, {
      status: "failed",
      errorMessage: err.message ?? "Unknown error",
    });
    throw err;
  }
}
