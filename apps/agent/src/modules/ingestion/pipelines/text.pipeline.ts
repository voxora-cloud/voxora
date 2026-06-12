import { DocumentJob } from "../ingestion.types";
import { streamFromText } from "../services/content-stream";
import { processIngestion } from "../services/process-ingestion";
import { setDocStatus } from "../services/doc-status.service";









export async function runTextIngestionPipeline(job: DocumentJob): Promise<void> {
  const {
    organizationId,
    documentId,
    content = "",
    fileName,
    metadata = {},
  } = job;

  if (!content.trim()) {
    await setDocStatus(organizationId, documentId, {
      status: "failed",
      errorMessage: "Content is empty",
    });
    return;
  }

  await setDocStatus(organizationId, documentId, { status: "indexing" });
  console.log(`[Text Ingestion] Starting: ${fileName}`);

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
      `[Text Ingestion] Done: ${result.chunksSucceeded} chunks for document ${documentId}`,
    );
  } catch (err: any) {
    await setDocStatus(organizationId, documentId, {
      status: "failed",
      errorMessage: err.message ?? "Unknown error",
    });
    throw err;
  }
}
