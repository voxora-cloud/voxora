import { DocumentJob } from "../ingestion.types";
import { streamFromCrawl, streamFromSingleUrl } from "../services/content-stream";
import { processIngestion } from "../services/process-ingestion";
import { setDocStatus } from "../services/doc-status.service";












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

  await setDocStatus(organizationId, documentId, { status: "indexing" });
  console.log(
    `[URL Ingestion] Starting ${fetchMode} of ${sourceUrl} (depth: ${crawlDepth})`,
  );

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

    console.log(
      `[URL Ingestion] Done: ${result.chunksSucceeded} chunks across ${result.unitsProcessed} page(s) — document ${documentId}`,
    );
  } catch (err: any) {
    await setDocStatus(organizationId, documentId, {
      status: "failed",
      errorMessage: err.message ?? "Unknown error",
    });
    throw err; // re-throw so BullMQ marks the job as failed
  }
}
