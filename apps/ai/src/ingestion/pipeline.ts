import { randomUUID } from "crypto";
import { DocumentJob } from "./types";
import { loadDocument } from "./loader";
import { chunkText } from "./chunker";
import { getEmbeddingProvider, vectorStore } from "../embeddings";
import { setDocStatus } from "../shared/db";

/**
 * Full document ingestion pipeline:
 *   1. Load raw text from MinIO
 *   2. Chunk into overlapping segments
 *   3. Generate an embedding vector for each chunk
 *   4. Upsert all vectors into Qdrant (deletes old vectors first)
 */
export async function runIngestionPipeline(job: DocumentJob): Promise<void> {
  const { organizationId, documentId, fileKey, mimeType, fileName, metadata = {} } = job;

  console.log(`[Ingestion] ════════════════════════════════════════════════════════════════════════════`);
  console.log(`[Ingestion] Starting document ingestion`);
  console.log(`[Ingestion]   Document ID    : ${documentId}`);
  console.log(`[Ingestion]   Organization   : ${organizationId}`);
  console.log(`[Ingestion]   File name      : ${fileName}`);
  console.log(`[Ingestion]   MIME type      : ${mimeType}`);
  console.log(`[Ingestion]   File key       : ${fileKey}`);
  console.log(`[Ingestion] ════════════════════════════════════════════════════════════════`);

  await setDocStatus(documentId, { status: "indexing" });

  try {
    // ── 1. Load ──────────────────────────────────────────────────────────────────
    console.log(`[Ingestion] Step 1: Loading document from MinIO...`);
    const rawText = await loadDocument(fileKey, mimeType);
    if (!rawText.trim()) {
      console.warn(`[Ingestion] ⚠️  Empty text extracted from ${fileKey} — skipping`);
      await setDocStatus(documentId, { status: "failed", errorMessage: "Empty document" });
      return;
    }
    console.log(`[Ingestion] ✓ Extracted ${rawText.length} characters`);

    // ── 2. Chunk ─────────────────────────────────────────────────────────────────
    console.log(`[Ingestion] Step 2: Chunking text...`);
    const chunks = chunkText(rawText);
    console.log(`[Ingestion] ✓ Split into ${chunks.length} chunks`);

    // ── 3. Embed ─────────────────────────────────────────────────────────────────
    console.log(`[Ingestion] Step 3: Generating embeddings and storing in Qdrant...`);
    const provider = getEmbeddingProvider();
    console.log(`[Ingestion]   Using provider: ${provider.constructor.name}`);
    console.log(`[Ingestion]   Embedding dimensions: ${provider.dimensions}`);

    // Ensure Qdrant collection exists with the correct dimensions
    await vectorStore.ensureCollection(provider.dimensions);

    // Delete any previously ingested vectors for this document (re-ingestion safe)
    console.log(`[Ingestion]   Deleting old vectors for doc: ${documentId}...`);
    await vectorStore.deleteByDocumentId(documentId, organizationId);

    // Embed and upsert in batches of 25 to avoid rate-limit spikes
    const BATCH_SIZE = 25;
    console.log(`[Ingestion]   Processing ${chunks.length} chunks in batches of ${BATCH_SIZE}...`);
    
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(chunks.length / BATCH_SIZE);

      console.log(`[Ingestion]   Batch ${batchNum}/${totalBatches}: Embedding ${batch.length} chunks...`);
      
      const points = await Promise.all(
        batch.map(async (chunk) => {
          const vector = await provider.embed(chunk.text);
          return {
            id: randomUUID(),
            vector,
            payload: {
              organizationId,
              documentId,
              fileKey,
              fileName,
              chunkIndex: chunk.index,
              text: chunk.text,
              ...metadata,
            },
          };
        }),
      );

      console.log(`[Ingestion]   Batch ${batchNum}/${totalBatches}: Upserting to Qdrant...`);
      console.log(`[Ingestion]     Sample payload: orgId=${points[0].payload.organizationId} docId=${points[0].payload.documentId}`);
      
      await vectorStore.upsert(points);
      
      console.log(`[Ingestion]   ✓ Batch ${batchNum}/${totalBatches} complete`);
    }

    await setDocStatus(documentId, {
      status: "indexed",
      wordCount: rawText.split(/\s+/).length,
      chunkCount: chunks.length,
      lastIndexed: new Date(),
    });

    console.log(`[Ingestion] ════════════════════════════════════════════════════════════════`);
    console.log(`[Ingestion] ✅ SUCCESS: Document ingested successfully`);
    console.log(`[Ingestion]   Document ID    : ${documentId}`);
    console.log(`[Ingestion]   Organization   : ${organizationId}`);
    console.log(`[Ingestion]   Chunks stored  : ${chunks.length}`);
    console.log(`[Ingestion]   Word count     : ${rawText.split(/\s+/).length}`);
    console.log(`[Ingestion] ════════════════════════════════════════════════════════════════`);
  } catch (err: any) {
    console.error(`[Ingestion] ════════════════════════════════════════════════════════════════`);
    console.error(`[Ingestion] ❌ FAILED: Document ingestion error`);
    console.error(`[Ingestion]   Document ID    : ${documentId}`);
    console.error(`[Ingestion]   Error message  : ${err.message}`);
    console.error(`[Ingestion]   Stack trace    :`);
    console.error(err.stack);
    console.error(`[Ingestion] ════════════════════════════════════════════════════════════════`);
    await setDocStatus(documentId, { status: "failed", errorMessage: err.message });
    throw err;
  }
}
