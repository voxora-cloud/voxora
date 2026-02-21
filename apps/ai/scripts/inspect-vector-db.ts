/**
 * Inspect the Qdrant vector collection — shows collection info and sample points.
 * Run with:  npx tsx scripts/inspect-vector-db.ts
 */
import dotenv from "dotenv";
dotenv.config();

import { QdrantClient } from "@qdrant/js-client-rest";

const COLLECTION = "voxora_knowledge";
const url = process.env.QDRANT_URL || "http://localhost:6333";

async function main() {
  const client = new QdrantClient({ url });

  const { exists } = await client.collectionExists(COLLECTION);
  if (!exists) {
    console.log(`Collection "${COLLECTION}" does not exist.`);
    return;
  }

  const info = await client.getCollection(COLLECTION);
  const vectorsConfig = (info.config?.params?.vectors as any);
  console.log(`\nCollection: ${COLLECTION}`);
  console.log(`  Vectors dim : ${vectorsConfig?.size}`);
  console.log(`  Distance    : ${vectorsConfig?.distance}`);
  console.log(`  Points count: ${info.points_count}`);

  if ((info.points_count ?? 0) === 0) {
    console.log("\nNo points stored.");
    return;
  }

  // Scroll first 5 points to inspect payloads
  const { points } = await client.scroll(COLLECTION, {
    limit: 5,
    with_payload: true,
    with_vector: true,
  });

  console.log(`\nSample points (${points.length}):`);
  for (const p of points) {
    const vec = p.vector as number[];
    console.log(`  id=${p.id}`);
    console.log(`    vectorDim : ${Array.isArray(vec) ? vec.length : "?"}`);
    console.log(`    teamId    : ${(p.payload as any)?.teamId}`);
    console.log(`    documentId: ${(p.payload as any)?.documentId}`);
    console.log(`    fileName  : ${(p.payload as any)?.fileName}`);
    console.log(`    text      : ${String((p.payload as any)?.text ?? "").slice(0, 80)}…`);
  }
}

main().catch((err) => {
  console.error("Inspect failed:", err.message);
  process.exit(1);
});
