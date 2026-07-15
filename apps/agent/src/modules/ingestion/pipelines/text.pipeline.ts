import { DocumentJob } from "../ingestion.types";
import { streamFromText } from "../services/content-stream";
import { processIngestion } from "../services/process-ingestion";
import { InternalApiService } from "../../../infrastructure/api/internal-api.service";

export async function runTextIngestionPipeline(job: DocumentJob): Promise<void> {
  const {
    organizationId,
    documentId,
    content = "",
    fileName,
    metadata = {},
  } = job;

  if (!content.trim()) {
    await InternalApiService.updateIngestionStatus(organizationId, documentId, {
      status: "failed",
      errorMessage: "Content is empty",
    });
    return;
  }

  console.log(`[Text Ingestion] ════════════════════════════════════════════════════════════════════════════`);
  console.log(`[Text Ingestion] Starting text ingestion`);
  console.log(`[Text Ingestion]   Document ID    : ${documentId}`);
  console.log(`[Text Ingestion]   Organization   : ${organizationId}`);
  console.log(`[Text Ingestion]   File name      : ${fileName}`);
  console.log(`[Text Ingestion] ════════════════════════════════════════════════════════════════`);

  await InternalApiService.updateIngestionStatus(organizationId, documentId, { status: "indexing" });

  try {
    const result = await processIngestion({
      organizationId,
      documentId,
      fileName,
      fileKey: "",
      metadata,
      contentStream: streamFromText(content, `text:${documentId}`, {
        sourceType: "text",
      }),
    });

    await InternalApiService.updateIngestionStatus(organizationId, documentId, {
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

    console.log(`[Text Ingestion] ════════════════════════════════════════════════════════════════`);
    console.log(`[Text Ingestion] ✅ SUCCESS: Text ingested successfully`);
    console.log(`[Text Ingestion]   Document ID    : ${documentId}`);
    console.log(`[Text Ingestion]   Organization   : ${organizationId}`);
    console.log(`[Text Ingestion]   Chunks stored  : ${result.chunksSucceeded}`);
    console.log(`[Text Ingestion]   Chunks failed  : ${result.chunksFailed}`);
    console.log(`[Text Ingestion]   Word count     : ${result.wordCount}`);
    console.log(`[Text Ingestion] ════════════════════════════════════════════════════════════════`);
  } catch (err: any) {
    console.error(`[Text Ingestion] ════════════════════════════════════════════════════════════════`);
    console.error(`[Text Ingestion] ❌ FAILED: Text ingestion error`);
    console.error(`[Text Ingestion]   Document ID    : ${documentId}`);
    console.error(`[Text Ingestion]   Error message  : ${err.message}`);
    console.error(`[Text Ingestion]   Stack trace    :`);
    console.error(err.stack);
    console.error(`[Text Ingestion] ════════════════════════════════════════════════════════════════`);
    await InternalApiService.updateIngestionStatus(organizationId, documentId, {
      status: "failed",
      errorMessage: err.message ?? "Unknown error",
    });
    throw err;
  }
}
