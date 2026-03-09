#!/usr/bin/env ts-node
/**
 * Qdrant Debug Utility
 * 
 * Inspect what documents are stored in Qdrant and verify multi-tenant isolation.
 * 
 * Usage:
 *   npm run debug:qdrant
 *   npm run debug:qdrant -- --org <organizationId>
 */

import { QdrantClient } from "@qdrant/js-client-rest";
import config from "./config";

const COLLECTION = "voxora_knowledge";

async function debugQdrant() {
  const args = process.argv.slice(2);
  const orgIdIndex = args.indexOf("--org");
  const filterOrgId = orgIdIndex !== -1 ? args[orgIdIndex + 1] : null;

  console.log(`\n${"=".repeat(70)}`);
  console.log("🔍 Qdrant Debug Utility");
  console.log(`${"=".repeat(70)}\n`);

  const client = new QdrantClient({
    url: config.qdrant.url,
    ...(config.qdrant.apiKey ? { apiKey: config.qdrant.apiKey } : {}),
  });

  try {
    // Check if collection exists
    const exists = await client.collectionExists(COLLECTION);
    if (!exists.exists) {
      console.log(`❌ Collection "${COLLECTION}" does not exist yet.`);
      console.log(`   Create it by ingesting a document.`);
      return;
    }

    // Get collection info
    const collectionInfo = await client.getCollection(COLLECTION);
    console.log(`✅ Collection: "${COLLECTION}"`);
    console.log(`   Total points: ${collectionInfo.points_count}`);
    console.log(`   Vector dimensions: ${(collectionInfo.config?.params?.vectors as any)?.size}`);
    console.log(`   Distance metric: ${(collectionInfo.config?.params?.vectors as any)?.distance}\n`);

    if (collectionInfo.points_count === 0) {
      console.log(`⚠️  Collection is EMPTY - no documents have been ingested yet.\n`);
      return;
    }

    // Scroll through points
    console.log(`📊 Scanning points...\n`);
    
    let offset: string | number | Record<string, unknown> | null = 0;
    const limit = 100;
    const orgStats: Record<string, { count: number; docs: Set<string> }> = {};
    let totalScanned = 0;

    while (offset !== null) {
      const response = await client.scroll(COLLECTION, {
        limit,
        offset,
        with_payload: true,
      });

      for (const point of response.points) {
        const payload = point.payload as any;
        const orgId = payload?.organizationId || "(unknown)";
        const docId = payload?.documentId || "(unknown)";

        if (!orgStats[orgId]) {
          orgStats[orgId] = { count: 0, docs: new Set() };
        }
        orgStats[orgId].count++;
        orgStats[orgId].docs.add(docId);
        totalScanned++;
      }

      offset = response.next_page_offset ?? null;
    }

    console.log(`Total vectors scanned: ${totalScanned}\n`);
    console.log(`${"=".repeat(70)}`);
    console.log(`Organizations in Qdrant:\n`);

    const orgIds = Object.keys(orgStats).sort();
    
    for (const orgId of orgIds) {
      const stats = orgStats[orgId];
      const isFiltered = filterOrgId && orgId === filterOrgId;
      
      if (filterOrgId && !isFiltered) continue;

      console.log(`${isFiltered ? "🎯" : "📦"} Organization: ${orgId}`);
      console.log(`   Vectors: ${stats.count}`);
      console.log(`   Documents: ${stats.docs.size}`);
      console.log(`   Document IDs: ${Array.from(stats.docs).slice(0, 5).join(", ")}${stats.docs.size > 5 ? "..." : ""}`);
      console.log();
    }

    if (filterOrgId && !orgIds.includes(filterOrgId)) {
      console.log(`⚠️  No data found for organization: ${filterOrgId}\n`);
    }

    console.log(`${"=".repeat(70)}\n`);

  } catch (error: any) {
    console.error(`❌ Error: ${error.message}`);
    if (error.stack) {
      console.error(error.stack);
    }
  }
}

debugQdrant().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
