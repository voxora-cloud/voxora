import { v4 as uuidv4 } from "uuid";
import logger from "@shared/utils/logger";
import {
  getPublicUrl,
  getPresignedUploadUrl,
  getPresignedDownloadUrl,
  statObject,
  removeObject,
  objectExists,
  listObjects,
} from "@shared/utils/storage";

export interface PresignedUrlResponse {
  uploadUrl: string;
  downloadUrl?: string;
  fileKey: string;
  fileName: string;
  expiresIn: number;
}

export interface FileMetadata {
  fileName: string;
  fileSize: number;
  mimeType: string;
  fileKey?: string;
}

class StorageService {
  // ── Public URL ─────────────────────────────────────────────────────────────
  // Use for permanently public assets (widget logos, avatars).
  // Bucket has a public-read policy applied at boot — no signing required.

  getPublicUrl(objectKey: string): string {
    return getPublicUrl(objectKey);
  }

  // ── Presigned upload URLs ──────────────────────────────────────────────────
  // Let clients upload directly to MinIO without passing data through the API.

  async generatePresignedUploadUrl(
    fileName: string,
    mimeType: string,
    expiresIn: number = 900,
  ): Promise<PresignedUrlResponse> {
    try {
      const ext = fileName.split(".").pop();
      const fileKey = `knowledge/${uuidv4()}.${ext}`;
      const uploadUrl = await getPresignedUploadUrl(fileKey, expiresIn);
      logger.info(`Generated presigned upload URL for: ${fileName}`);
      return { uploadUrl, fileKey, fileName, expiresIn };
    } catch (error) {
      logger.error("Error generating presigned upload URL:", error);
      throw new Error("Failed to generate upload URL");
    }
  }

  async generateConversationUploadUrl(
    fileName: string,
    mimeType: string,
    expiresIn: number = 300,
  ): Promise<PresignedUrlResponse> {
    try {
      const ext = fileName.split(".").pop();
      const fileKey = `conversations/${uuidv4()}.${ext}`;

      // Upload + 7-day download URL generated together
      const [uploadUrl, downloadUrl] = await Promise.all([
        getPresignedUploadUrl(fileKey, expiresIn),
        getPresignedDownloadUrl(fileKey, 604800), // 7 days — stored in message metadata
      ]);

      logger.info(`Generated conversation upload URL for: ${fileName}`);
      return { uploadUrl, downloadUrl, fileKey, fileName, expiresIn };
    } catch (error) {
      logger.error("Error generating conversation upload URL:", error);
      throw new Error("Failed to generate upload URL");
    }
  }

  // ── Presigned download URLs ────────────────────────────────────────────────
  // Use for access-controlled content (knowledge docs, private attachments).

  async generatePresignedDownloadUrl(
    fileKey: string,
    expiresIn: number = 3600,
  ): Promise<string> {
    try {
      const url = await getPresignedDownloadUrl(fileKey, expiresIn);
      logger.info(`Generated presigned download URL for: ${fileKey}`);
      return url;
    } catch (error) {
      logger.error("Error generating presigned download URL:", error);
      throw new Error("Failed to generate download URL");
    }
  }

  // ── Object management ──────────────────────────────────────────────────────

  async deleteFile(fileKey: string): Promise<void> {
    try {
      await removeObject(fileKey);
      logger.info(`Deleted file from storage: ${fileKey}`);
    } catch (error) {
      logger.error("Error deleting file:", error);
      throw new Error("Failed to delete file");
    }
  }

  async getFileMetadata(fileKey: string): Promise<any> {
    try {
      const stat = await statObject(fileKey);
      return {
        size: stat.size,
        etag: stat.etag,
        lastModified: stat.lastModified,
        metaData: stat.metaData,
      };
    } catch (error) {
      logger.error("Error getting file metadata:", error);
      throw new Error("Failed to get file metadata");
    }
  }

  async fileExists(fileKey: string): Promise<boolean> {
    return objectExists(fileKey);
  }

  async listFiles(prefix: string = "knowledge/"): Promise<string[]> {
    try {
      return await listObjects(prefix);
    } catch (error) {
      logger.error("Error listing files:", error);
      throw new Error("Failed to list files");
    }
  }
}

export default new StorageService();

