import { internalApi } from "./internal.client";

export interface SyncInfoResponse {
  _id: string;
  organizationId: string;
  title: string;
  source: string;
  sourceUrl?: string;
  fetchMode?: string;
  crawlDepth?: number;
  syncFrequency?: string;
  isPaused?: boolean;
}

export interface IngestionStatusUpdate {
  status: "indexing" | "indexed" | "failed";
  wordCount?: number;
  chunkCount?: number;
  lastIndexed?: Date;
  errorMessage?: string;
  failedChunkCount?: number;
  totalChunkCount?: number;
}

export const InternalApiService = {
  /**
   * Fetch sync metadata/info for a document
   */
  async getSyncInfo(documentId: string, organizationId: string): Promise<SyncInfoResponse | null> {
    const { data } = await internalApi.get(`/knowledge/ai/${documentId}/sync-info`, {
      params: { organizationId },
    });
    return data?.data ?? null;
  },

  /**
   * Update the status and metrics of a document ingestion job
   */
  async updateIngestionStatus(
    organizationId: string,
    documentId: string,
    update: IngestionStatusUpdate,
  ): Promise<void> {
    await internalApi.patch(`/knowledge/ai/${documentId}/status`, {
      organizationId,
      ...update,
      lastIndexed: update.lastIndexed?.toISOString(),
    });
  },

  /**
   * Send a system/AI status notification to the gateway
   */
  async sendNotification(
    organizationId: string,
    type: string,
    title: string,
    description: string,
  ): Promise<void> {
    await internalApi.post("/notifications/ai", {
      organizationId,
      type,
      title,
      description,
    });
  },
};
