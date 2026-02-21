/**
 * Resets the Qdrant vector collection used by Voxora.
 * Run with:  npx tsx scripts/reset-vector-db.ts
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
    console.log(`[Reset] Collection "${COLLECTION}" does not exist — nothing to do.`);
    return;
  }

  await client.deleteCollection(COLLECTION);
  console.log(`[Reset] Collection "${COLLECTION}" deleted. It will be recreated automatically on next ingestion.`);
}

main().catch((err) => {
  console.error("[Reset] Failed:", err.message);
  process.exit(1);
});
