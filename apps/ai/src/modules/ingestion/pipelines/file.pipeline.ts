import { DocumentJob } from "../ingestion.types";
import { loadDocumentStream } from "../sources/loader";
import { processIngestion } from "../services/process-ingestion";
import { setDocStatus } from "../../../shared/db/db";

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

  await setDocStatus(organizationId, documentId, { status: "indexing" });

  try {
    const result = await processIngestion({
      organizationId,
      documentId,
      sourceType: job.source,
      fileName,
      fileKey,
      metadata,
      contentStream: loadDocumentStream(fileKey, mimeType),
    });

    await setDocStatus(organizationId, documentId, {
      status: "indexed",
      wordCount: result.wordCount,
      chunkCount: result.chunksSucceeded,
      totalChunkCount: result.chunksTotal,
      failedChunkCount: result.chunksFailed,
      lastIndexed: new Date(),
      ...(result.chunksFailed > 0
        ? { errorMessage: `Partial ingestion: ${result.chunksFailed} chunks failed` }
        : {}),
    });

    console.log(`[Ingestion] ════════════════════════════════════════════════════════════════`);
    console.log(`[Ingestion] ✅ SUCCESS: Document ingested successfully`);
    console.log(`[Ingestion]   Document ID    : ${documentId}`);
    console.log(`[Ingestion]   Organization   : ${organizationId}`);
    console.log(`[Ingestion]   Chunks stored  : ${result.chunksSucceeded}`);
    console.log(`[Ingestion]   Chunks failed  : ${result.chunksFailed}`);
    console.log(`[Ingestion]   Word count     : ${result.wordCount}`);
    console.log(`[Ingestion] ════════════════════════════════════════════════════════════════`);
  } catch (err: any) {
    console.error(`[Ingestion] ════════════════════════════════════════════════════════════════`);
    console.error(`[Ingestion] ❌ FAILED: Document ingestion error`);
    console.error(`[Ingestion]   Document ID    : ${documentId}`);
    console.error(`[Ingestion]   Error message  : ${err.message}`);
    console.error(`[Ingestion]   Stack trace    :`);
    console.error(err.stack);
    console.error(`[Ingestion] ════════════════════════════════════════════════════════════════`);
    await setDocStatus(organizationId, documentId, {
      status: "failed",
      errorMessage: err.message,
    });
    throw err;
  }
}
