export interface VectorSearchResult {
  id: string | number;
  score: number;
  payload: {
    organizationId: string;
    documentId: string;
    fileKey: string;  // empty string for text/url sources
    fileName: string;
    chunkIndex: number;
    text: string;
    [key: string]: unknown;
  };
}

export interface VectorStore {
  /**
   * Ensure the collection/index exists. Called once at startup.
   * Should be idempotent — safe to call if it already exists.
   */
  ensureCollection(dimensions: number): Promise<void>;

  /** Insert or overwrite a set of vectors with their payloads */
  upsert(
    points: Array<{
      id: string;
      vector: number[];
      payload: VectorSearchResult["payload"];
    }>,
  ): Promise<void>;

  /** Semantic search — returns top-K results filtered by organizationId */
  search(
    vector: number[],
    options: { organizationId: string; documentId?: string; topK?: number },
  ): Promise<VectorSearchResult[]>;

  /** Remove all vectors belonging to a specific document */
  deleteByDocumentId(documentId: string, organizationId: string): Promise<void>;
}
