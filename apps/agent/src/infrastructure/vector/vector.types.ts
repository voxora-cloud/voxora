export interface VectorSearchResult {
  id: string | number;
  score: number;
  payload: {
    organizationId: string;
    documentId: string;
    fileKey: string;
    fileName: string;
    chunkIndex: number;
    text: string;
    [key: string]: unknown;
  };
}

export interface VectorStore {

  ensureCollection(dimensions: number): Promise<void>;


  upsert(
    points: Array<{
      id: string;
      vector: number[];
      payload: VectorSearchResult["payload"];
    }>,
  ): Promise<void>;


  search(
    vector: number[],
    options: { organizationId: string; topK?: number; type?: string },
  ): Promise<VectorSearchResult[]>;


  deleteByDocumentId(documentId: string, organizationId: string): Promise<void>;
}
