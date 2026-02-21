import { QdrantClient } from "@qdrant/js-client-rest";
import config from "../../config";
import { VectorStore, VectorSearchResult } from "./types";

const COLLECTION = "voxora_knowledge";

class QdrantVectorStore implements VectorStore {
  private client: QdrantClient;

  constructor() {
    this.client = new QdrantClient({
      url: config.qdrant.url,
      ...(config.qdrant.apiKey ? { apiKey: config.qdrant.apiKey } : {}),
    });
  }

  async ensureCollection(dimensions: number): Promise<void> {
    const existing = await this.client.collectionExists(COLLECTION);

    if (existing.exists) {
      // Verify dimensions match — recreate if they don't (e.g. model was swapped)
      const info = await this.client.getCollection(COLLECTION);
      const existingSize = (info.config?.params?.vectors as any)?.size as number | undefined;
      if (existingSize === dimensions) return;

      console.warn(
        `[Qdrant] Collection "${COLLECTION}" has ${existingSize}d but provider needs ${dimensions}d — recreating`,
      );
      await this.client.deleteCollection(COLLECTION);
    }

    await this.client.createCollection(COLLECTION, {
      vectors: { size: dimensions, distance: "Cosine" },
    });

    // Index teamId and documentId fields for fast filtered search
    await this.client.createPayloadIndex(COLLECTION, {
      field_name: "teamId",
      field_schema: "keyword",
    });
    await this.client.createPayloadIndex(COLLECTION, {
      field_name: "documentId",
      field_schema: "keyword",
    });

    console.log(
      `[Qdrant] Collection "${COLLECTION}" created (${dimensions}d, Cosine)`,
    );
  }

  async upsert(
    points: Array<{
      id: string;
      vector: number[];
      payload: VectorSearchResult["payload"];
    }>,
  ): Promise<void> {
    await this.client.upsert(COLLECTION, {
      wait: true,
      points: points.map((p) => ({
        id: p.id,
        vector: p.vector,
        payload: p.payload as Record<string, unknown>,
      })),
    });
  }

  async search(
    vector: number[],
    options: { teamId?: string; topK?: number },
  ): Promise<VectorSearchResult[]> {
    console.log(`[Qdrant] Searching collection="${COLLECTION}" vectorDim=${vector.length} teamId=${options.teamId || "(none)"} topK=${options.topK ?? 5}`);

    const results = await this.client.search(COLLECTION, {
      vector,
      limit: options.topK ?? 5,
      // Only filter by teamId when one is provided and non-empty
      ...(options.teamId
        ? { filter: { must: [{ key: "teamId", match: { value: options.teamId } }] } }
        : {}),
      with_payload: true,
    });

    console.log(`[Qdrant] Raw results: ${results.length}`);

    return results.map((r) => ({
      id: r.id,
      score: r.score,
      payload: r.payload as VectorSearchResult["payload"],
    }));
  }

  async deleteByDocumentId(documentId: string): Promise<void> {
    await this.client.delete(COLLECTION, {
      filter: {
        must: [{ key: "documentId", match: { value: documentId } }],
      },
    });
  }
}

// Singleton
export const vectorStore: VectorStore = new QdrantVectorStore();
