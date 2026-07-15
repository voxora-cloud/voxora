import { createHash } from "crypto";

export function generateDeterministicChunkId(input: {
  organizationId: string;
  documentId: string;
  sourceRef: string;
  chunkIndex: number;
}): string {
  const hex = createHash("sha256")
    .update(
      `${input.organizationId}:${input.documentId}:${input.sourceRef}:${input.chunkIndex}`,
    )
    .digest("hex");

  // Qdrant point ids are safest as UUIDs (or integers). Convert deterministic hash
  // into a stable UUIDv4-shaped string to avoid HTTP 400 Bad Request on upsert.
  const base = hex.slice(0, 32);
  const v4 = `${base.slice(0, 8)}-${base.slice(8, 12)}-4${base.slice(13, 16)}-${(
    (parseInt(base.slice(16, 17), 16) & 0x3) |
    0x8
  ).toString(16)}${base.slice(17, 20)}-${base.slice(20, 32)}`;
  return v4;
}
