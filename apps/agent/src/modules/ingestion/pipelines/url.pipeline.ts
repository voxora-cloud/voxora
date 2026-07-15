import { DocumentJob } from "../ingestion.types";
import { streamFromCrawl, streamFromSingleUrl } from "../services/content-stream";
import { processIngestion } from "../services/process-ingestion";
import { InternalApiService } from "../../../infrastructure/api/internal-api.service";

export async function runUrlIngestionPipeline(job: DocumentJob): Promise<void> {
  const {
    organizationId,
    documentId,
    sourceUrl,
    fetchMode = "single",
    crawlDepth = 1,
    fileName,
    metadata = {},
  } = job;

  if (!sourceUrl) {
    throw new Error(`[URL Ingestion] sourceUrl missing for document ${documentId}`);
  }

  console.log(`[URL Ingestion] ════════════════════════════════════════════════════════════════════════════`);
  console.log(`[URL Ingestion] Starting URL ingestion`);
  console.log(`[URL Ingestion]   Document ID    : ${documentId}`);
  console.log(`[URL Ingestion]   Organization   : ${organizationId}`);
  console.log(`[URL Ingestion]   Source URL     : ${sourceUrl}`);
  console.log(`[URL Ingestion]   Fetch mode     : ${fetchMode}`);
  console.log(`[URL Ingestion]   Crawl depth    : ${crawlDepth}`);
  console.log(`[URL Ingestion]   File name      : ${fileName}`);
  console.log(`[URL Ingestion] ════════════════════════════════════════════════════════════════`);

  await InternalApiService.updateIngestionStatus(organizationId, documentId, { status: "indexing" });

  try {
    const contentStream =
      fetchMode === "crawl"
        ? streamFromCrawl(sourceUrl, crawlDepth)
        : streamFromSingleUrl(sourceUrl);

    const result = await processIngestion({
      organizationId,
      documentId,
      fileName,
      fileKey: "",
      metadata: {
        sourceUrl,
        fetchMode,
        crawlDepth,
        ...metadata,
      },
      contentStream,
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

    console.log(`[URL Ingestion] ════════════════════════════════════════════════════════════════`);
    console.log(`[URL Ingestion] ✅ SUCCESS: URL ingested successfully`);
    console.log(`[URL Ingestion]   Document ID    : ${documentId}`);
    console.log(`[URL Ingestion]   Organization   : ${organizationId}`);
    console.log(`[URL Ingestion]   Chunks stored  : ${result.chunksSucceeded}`);
    console.log(`[URL Ingestion]   Chunks failed  : ${result.chunksFailed}`);
    console.log(`[URL Ingestion]   Pages processed: ${result.unitsProcessed}`);
    console.log(`[URL Ingestion]   Word count     : ${result.wordCount}`);
    console.log(`[URL Ingestion] ════════════════════════════════════════════════════════════════`);
  } catch (err: any) {
    console.error(`[URL Ingestion] ════════════════════════════════════════════════════════════════`);
    console.error(`[URL Ingestion] ❌ FAILED: URL ingestion error`);
    console.error(`[URL Ingestion]   Document ID    : ${documentId}`);
    console.error(`[URL Ingestion]   Error message  : ${err.message}`);
    console.error(`[URL Ingestion]   Stack trace    :`);
    console.error(err.stack);
    console.error(`[URL Ingestion] ════════════════════════════════════════════════════════════════`);
    await InternalApiService.updateIngestionStatus(organizationId, documentId, {
      status: "failed",
      errorMessage: err.message ?? "Unknown error",
    });
    throw err;
  }
}
