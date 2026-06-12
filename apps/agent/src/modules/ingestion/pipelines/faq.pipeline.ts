import { DocumentJob } from "../ingestion.types";
import { setDocStatus } from "../services/doc-status.service";
import { getEmbeddingProvider } from "../../../infrastructure/providers/embedding";
import { vectorStore } from "../../../infrastructure/vector";
import { generateDeterministicChunkId } from "../utils/chunk-id";
import logger from "../../../utils/logger";

export async function runFaqIngestionPipeline(job: DocumentJob): Promise<void> {
  const {
    organizationId,
    documentId,
    content = "",
    fileName, // This matches the title in the job
  } = job;

  // Curated title is the Question, content is the Answer
  const question = fileName ? fileName.trim() : "";
  const answer = content ? content.trim() : "";

  if (!question) {
    await setDocStatus(organizationId, documentId, {
      status: "failed",
      errorMessage: "FAQ Question is empty",
    });
    return;
  }

  if (!answer) {
    await setDocStatus(organizationId, documentId, {
      status: "failed",
      errorMessage: "FAQ Answer is empty",
    });
    return;
  }

  await setDocStatus(organizationId, documentId, { status: "indexing" });
  logger.info(`[FAQ Ingestion] Starting indexing for document ${documentId}`, {
    documentId,
    organizationId,
    question,
  });

  try {
    // Generate vector embedding on the curated Question (title) only
    const embeddingProvider = getEmbeddingProvider();
    const queryVector = await embeddingProvider.embed(question);

    // Delete any pre-existing vectors for this document
    await vectorStore.deleteByDocumentId(documentId, organizationId);

    // Generate a stable, deterministic UUID for this point
    const pointId = generateDeterministicChunkId({
      organizationId,
      documentId,
      sourceRef: "faq",
      chunkIndex: 0,
    });

    // Upsert the point to Qdrant
    await vectorStore.upsert([
      {
        id: pointId,
        vector: queryVector,
        payload: {
          type: "faq",
          documentId,
          organizationId,
          fileKey: "",
          fileName: question,
          chunkIndex: 0,
          text: `Question: ${question}\nAnswer: ${answer}`,
          question,
          answer,
        },
      },
    ]);

    // Update document status in Mongo to indexed
    await setDocStatus(organizationId, documentId, {
      status: "indexed",
      wordCount: question.split(/\s+/).length + answer.split(/\s+/).length,
      chunkCount: 1,
      totalChunkCount: 1,
      failedChunkCount: 0,
      lastIndexed: new Date(),
    });

    logger.info(`[FAQ Ingestion] Successfully indexed FAQ ${documentId}`, {
      documentId,
      organizationId,
      question,
    });
  } catch (err: any) {
    logger.error(`[FAQ Ingestion] Ingestion failed for FAQ ${documentId}`, {
      documentId,
      organizationId,
      error: err,
    });
    await setDocStatus(organizationId, documentId, {
      status: "failed",
      errorMessage: err.message ?? "Unknown error",
    });
    throw err;
  }
}
