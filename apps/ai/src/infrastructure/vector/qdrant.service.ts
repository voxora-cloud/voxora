import { QdrantClient } from "@qdrant/js-client-rest";
import config from "../../config";
import { VectorStore, VectorSearchResult } from "./vector.types";

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

    // Index documentId and organizationId fields for fast filtered search
    await this.client.createPayloadIndex(COLLECTION, {
      field_name: "organizationId",
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
    options: { organizationId: string; topK?: number },
  ): Promise<VectorSearchResult[]> {
    console.log(`[Qdrant] ════════════════════════════════════════════════`);
    console.log(`[Qdrant] Starting vector search`);
    console.log(`[Qdrant]   Collection    : "${COLLECTION}"`);
    console.log(`[Qdrant]   Vector dim    : ${vector.length}`);
    console.log(`[Qdrant]   Organization  : ${options.organizationId}`);
    console.log(`[Qdrant]   Top K         : ${options.topK ?? 5}`);

    // Check if collection exists
    try {
      const collectionInfo = await this.client.getCollection(COLLECTION);
      const pointsCount = collectionInfo.points_count || 0;
      console.log(`[Qdrant]   Collection exists: YES`);
      console.log(`[Qdrant]   Total points: ${pointsCount}`);
      
      if (pointsCount === 0) {
        console.log(`[Qdrant]   ⚠️  Collection is EMPTY - no documents ingested yet`);
      }
    } catch (err: any) {
      console.log(`[Qdrant]   ❌ Collection exists: NO`);
      console.log(`[Qdrant]   Error: ${err?.message}`);
      throw err;
    }

    const mustConditions: any[] = [
      { key: "organizationId", match: { value: options.organizationId } }
    ];

    console.log(`[Qdrant]   Filter: organizationId == "${options.organizationId}"`);

    const searchParams = {
      vector,
      limit: options.topK ?? 5,
      filter: { must: mustConditions },
      with_payload: true,
    };

    console.log(`[Qdrant]   Executing search...`);
    const results = await this.client.search(COLLECTION, searchParams);

    console.log(`[Qdrant]   ✓ Search completed`);
    console.log(`[Qdrant]   Results found: ${results.length}`);
    
    if (results.length > 0) {
      console.log(`[Qdrant]   Top matches:`);
      results.slice(0, 3).forEach((r, i) => {
        const payload = r.payload as any;
        console.log(`[Qdrant]     ${i + 1}. score=${r.score.toFixed(4)} id=${r.id} orgId=${payload?.organizationId}`);
      });
    } else {
      console.log(`[Qdrant]   ⚠️  No results matched for organizationId: ${options.organizationId}`);
      console.log(`[Qdrant]   Debug: Check if documents have been ingested for this organization`);
    }
    console.log(`[Qdrant] ════════════════════════════════════════════════`);

    return results.map((r) => ({
      id: r.id,
      score: r.score,
      payload: r.payload as VectorSearchResult["payload"],
    }));
  }

  async deleteByDocumentId(documentId: string, organizationId: string): Promise<void> {
    await this.client.delete(COLLECTION, {
      filter: {
        must: [
          { key: "organizationId", match: { value: organizationId } },
          { key: "documentId", match: { value: documentId } }
        ],
      },
    });
  }
}

// Singleton
export const vectorStore: VectorStore = new QdrantVectorStore();
