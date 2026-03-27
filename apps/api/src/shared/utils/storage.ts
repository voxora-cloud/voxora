import { minioClient, VOXORA_BUCKET } from "@shared/config/minio";
import type { Readable } from "stream";
import config from "@shared/config";

// ── Public URL ────────────────────────────────────────────────────────────────

/**
 * Build a permanent, publicly-accessible URL for an object.
 *
 * Works because `initializeMinIO` applies a public-read `s3:GetObject` bucket
 * policy at startup. Use for assets that need no access control:
 *   - Widget logos
 *   - Organisation avatars
 *   - Other publicly-served brand assets
 */
export function getPublicUrl(objectKey: string): string {
  const base = config.minio.publicUrl.replace(/\/$/, "");
  if (base) return `${base}/${VOXORA_BUCKET}/${objectKey}`;
  const protocol = config.minio.useSSL ? "https" : "http";
  return `${protocol}://${config.minio.endpoint}:${config.minio.port}/${VOXORA_BUCKET}/${objectKey}`;
}

// ── Presigned URLs ────────────────────────────────────────────────────────────

/**
 * Generate a presigned PUT URL so clients upload directly to MinIO.
 *
 * Use for: client-side file uploads (knowledge docs, conversation attachments).
 *   - Never expose your storage credentials to the client.
 *   - Default expiry: 15 minutes.
 */
export async function getPresignedUploadUrl(
  objectKey: string,
  expiresIn: number = 900,
): Promise<string> {
  const url = await minioClient.presignedPutObject(VOXORA_BUCKET, objectKey, expiresIn);
  return _normalizeUrl(url);
}

/**
 * Generate a presigned GET URL for time-limited client-side download.
 *
 * Use for:
 *   - Knowledge documents (short-lived, e.g. 5–15 min)
 *   - Conversation attachments (longer-lived, e.g. 7 days)
 *
 * Do NOT use for permanently public assets — use `getPublicUrl` instead.
 * Default expiry: 1 hour.
 */
export async function getPresignedDownloadUrl(
  objectKey: string,
  expiresIn: number = 3600,
): Promise<string> {
  const url = await minioClient.presignedGetObject(VOXORA_BUCKET, objectKey, expiresIn);
  return _normalizeUrl(url);
}

// ── Server-side operations ────────────────────────────────────────────────────

/**
 * Stream an object body from MinIO.
 *
 * Use for: server-side proxy when the client cannot reach MinIO directly
 * (e.g. the widget iframe, internal tooling, SSR pages).
 * Pipe the returned stream straight to an HTTP response.
 */
export async function downloadStream(objectKey: string): Promise<Readable> {
  return minioClient.getObject(VOXORA_BUCKET, objectKey);
}

/**
 * Retrieve object metadata: size, etag, lastModified, metaData headers.
 * Throws if the object does not exist.
 */
export async function statObject(objectKey: string) {
  return minioClient.statObject(VOXORA_BUCKET, objectKey);
}

/**
 * Permanently delete an object.
 */
export async function removeObject(objectKey: string): Promise<void> {
  await minioClient.removeObject(VOXORA_BUCKET, objectKey);
}

/**
 * Return true when an object exists, false when it does not.
 * Never throws.
 */
export async function objectExists(objectKey: string): Promise<boolean> {
  try {
    await minioClient.statObject(VOXORA_BUCKET, objectKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * List all object keys under a prefix (recursive).
 */
export function listObjects(prefix: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const keys: string[] = [];
    const stream = minioClient.listObjects(VOXORA_BUCKET, prefix, true);
    stream.on("data", (obj) => { if (obj.name) keys.push(obj.name); });
    stream.on("error", reject);
    stream.on("end", () => resolve(keys));
  });
}

// ── Internal helper ───────────────────────────────────────────────────────────

/**
 * Ensure presigned URLs carry the correct public-facing host.
 *
 * When `MINIO_SERVER_URL` is configured, MinIO already embeds the public base
 * URL in every presigned URL it generates — pass it through unchanged so the
 * AWS signature stays valid.
 *
 * Without `MINIO_SERVER_URL` (local dev without external CDN), MinIO uses its
 * internal hostname, so we rewrite it to the derived publicUrl.
 */
function _normalizeUrl(url: string): string {
  const publicBase = config.minio.publicUrl.replace(/\/$/, "");
  if (!publicBase || url.includes(publicBase)) return url;
  return url.replace(/^https?:\/\/[^/]+/, publicBase);
}
