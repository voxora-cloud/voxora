import { randomUUID } from "crypto";
import { DocumentJob } from "./types";
import { loadDocument } from "./loader";
import { chunkText } from "./chunker";
import { getEmbeddingProvider, vectorStore } from "../embeddings";

/**
 * Full document ingestion pipeline:
 *   1. Load raw text from MinIO
 *   2. Chunk into overlapping segments
 *   3. Generate an embedding vector for each chunk
 *   4. Upsert all vectors into Qdrant (deletes old vectors first)
 */
export async function runIngestionPipeline(job: DocumentJob): Promise<void> {
  const { documentId, fileKey, mimeType, fileName, teamId = "", metadata = {} } = job;

  console.log(`[Ingestion] Starting: ${fileName} (${mimeType})`);

  // ── 1. Load ──────────────────────────────────────────────────────────────────
  const rawText = await loadDocument(fileKey, mimeType);
  if (!rawText.trim()) {
    console.warn(`[Ingestion] Empty text extracted from ${fileKey} — skipping`);
    return;
  }
  console.log(`[Ingestion] Extracted ${rawText.length} chars from ${fileName}`);

  // ── 2. Chunk ─────────────────────────────────────────────────────────────────
  const chunks = chunkText(rawText);
  console.log(`[Ingestion] Split into ${chunks.length} chunks`);

  // ── 3. Embed ─────────────────────────────────────────────────────────────────
  const provider = getEmbeddingProvider();

  // Ensure Qdrant collection exists with the correct dimensions
  await vectorStore.ensureCollection(provider.dimensions);

  // Delete any previously ingested vectors for this document (re-ingestion safe)
  await vectorStore.deleteByDocumentId(documentId);

  // Embed and upsert in batches of 25 to avoid rate-limit spikes
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
            fileKey,
            fileName,
            chunkIndex: chunk.index,
            text: chunk.text,
            ...metadata,
          },
        };
      }),
    );

    await vectorStore.upsert(points);
    console.log(
      `[Ingestion] Upserted batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(chunks.length / BATCH_SIZE)}`,
    );
  }

  console.log(
    `[Ingestion] Done: ${chunks.length} chunks stored for document ${documentId}`,
  );
}
