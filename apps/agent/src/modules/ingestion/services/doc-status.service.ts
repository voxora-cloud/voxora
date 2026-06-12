import { internalApi } from "../../../infrastructure/api/internal.client";

export async function setDocStatus(
  organizationId: string,
  documentId: string,
  update: {
    status: "indexing" | "indexed" | "failed";
    wordCount?: number;
    chunkCount?: number;
    lastIndexed?: Date;
    errorMessage?: string;
    failedChunkCount?: number;
    totalChunkCount?: number;
  },
): Promise<void> {
  await internalApi.patch(`/knowledge/ai/${documentId}/status`, {
    organizationId,
    ...update,
    lastIndexed: update.lastIndexed?.toISOString(),
  });
}
