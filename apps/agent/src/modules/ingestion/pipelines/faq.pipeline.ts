import { DocumentJob } from "../ingestion.types";
import { InternalApiService } from "../../../infrastructure/api/internal-api.service";
import { ProviderFactory } from "../../../infrastructure/providers";
import { vectorStore } from "../../../infrastructure/vector";
import { generateDeterministicChunkId } from "../../../shared/id";
import logger from "../../../shared/logger";

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
    await InternalApiService.updateIngestionStatus(organizationId, documentId, {
      status: "failed",
      errorMessage: "FAQ Question is empty",
    });
    return;
  }

  if (!answer) {
    await InternalApiService.updateIngestionStatus(organizationId, documentId, {
      status: "failed",
      errorMessage: "FAQ Answer is empty",
    });
    return;
  }

  console.log(`[FAQ Ingestion] ════════════════════════════════════════════════════════════════════════════`);
  console.log(`[FAQ Ingestion] Starting FAQ ingestion`);
  console.log(`[FAQ Ingestion]   Document ID    : ${documentId}`);
  console.log(`[FAQ Ingestion]   Organization   : ${organizationId}`);
  console.log(`[FAQ Ingestion]   Question       : ${question}`);
  console.log(`[FAQ Ingestion] ════════════════════════════════════════════════════════════════`);

  await InternalApiService.updateIngestionStatus(organizationId, documentId, { status: "indexing" });

  try {
    // Generate vector embedding on the curated Question (title) only
    const embeddingProvider = ProviderFactory.getEmbeddingProvider();
    const queryVector = await embeddingProvider.embed(question, { organizationId });

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
    await InternalApiService.updateIngestionStatus(organizationId, documentId, {
      status: "indexed",
      wordCount: question.split(/\s+/).length + answer.split(/\s+/).length,
      chunkCount: 1,
      totalChunkCount: 1,
      failedChunkCount: 0,
      lastIndexed: new Date(),
    });

    console.log(`[FAQ Ingestion] ════════════════════════════════════════════════════════════════`);
    console.log(`[FAQ Ingestion] ✅ SUCCESS: FAQ ingested successfully`);
    console.log(`[FAQ Ingestion]   Document ID    : ${documentId}`);
    console.log(`[FAQ Ingestion]   Organization   : ${organizationId}`);
    console.log(`[FAQ Ingestion]   Chunks stored  : 1`);
    console.log(`[FAQ Ingestion]   Word count     : ${question.split(/\s+/).length + answer.split(/\s+/).length}`);
    console.log(`[FAQ Ingestion] ════════════════════════════════════════════════════════════════`);
  } catch (err: any) {
    console.error(`[FAQ Ingestion] ════════════════════════════════════════════════════════════════`);
    console.error(`[FAQ Ingestion] ❌ FAILED: FAQ ingestion error`);
    console.error(`[FAQ Ingestion]   Document ID    : ${documentId}`);
    console.error(`[FAQ Ingestion]   Error message  : ${err.message}`);
    console.error(`[FAQ Ingestion]   Stack trace    :`);
    console.error(err.stack);
    console.error(`[FAQ Ingestion] ════════════════════════════════════════════════════════════════`);
    await InternalApiService.updateIngestionStatus(organizationId, documentId, {
      status: "failed",
      errorMessage: err.message ?? "Unknown error",
    });
    throw err;
  }
}