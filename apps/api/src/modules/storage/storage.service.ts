import { minioClient, VOXORA_BUCKET } from "@shared/config/minio";
import { v4 as uuidv4 } from "uuid";
import logger from "@shared/utils/logger";
import config from "@shared/config";

/**
 * Rewrites internal MinIO hostname in presigned URLs to the public URL.
 * 
 * IMPORTANT: This should NOT be used when MINIO_SERVER_URL is properly configured,
 * because MinIO already generates presigned URLs with the correct public hostname,
 * and replacing it will break the AWS signature validation.
 * 
 * This function is kept for backward compatibility but should be phased out.
 */
function toPublicUrl(url: string): string {
  // If MINIO_SERVER_URL (publicUrl) is configured, MinIO already generates
  // URLs with the correct host. Return as-is to preserve the signature.
  const publicBase = config.minio.publicUrl.replace(/\/$/, "");
  if (publicBase && url.includes(publicBase)) {
    return url; // Already has public URL, don't modify (preserves signature)
  }
  
  // Fallback: replace internal hostname with public URL
  // This only happens if MINIO_SERVER_URL is not configured properly
  return url.replace(/^https?:\/\/[^/]+/, publicBase);
}

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
  getPublicUrl(objectKey: string): string {
    const publicUrl = config.minio.publicUrl;
    if (publicUrl) {
      return `${publicUrl.replace(/\/$/, "")}/${VOXORA_BUCKET}/${objectKey}`;
    }
    const minioEndpoint = process.env.MINIO_ENDPOINT || "localhost";
    const minioPort = process.env.MINIO_PORT || "9001";
    const useSSL = process.env.MINIO_USE_SSL === "true";
    const protocol = useSSL ? "https" : "http";
    return `${protocol}://${minioEndpoint}:${minioPort}/${VOXORA_BUCKET}/${objectKey}`;
  }

  async generatePresignedUploadUrl(
    fileName: string,
    mimeType: string,
    expiresIn: number = 900,
  ): Promise<PresignedUrlResponse> {
    try {
      const fileExtension = fileName.split(".").pop();
      const fileKey = `knowledge/${uuidv4()}.${fileExtension}`;

      const uploadUrl = toPublicUrl(await minioClient.presignedPutObject(
        VOXORA_BUCKET,
        fileKey,
        expiresIn,
      ));

      logger.info(`Generated presigned upload URL for: ${fileName}`);

      return {
        uploadUrl,
        fileKey,
        fileName,
        expiresIn,
      };
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
      const fileExtension = fileName.split(".").pop();
      const fileKey = `conversations/${uuidv4()}.${fileExtension}`;
      const uploadUrl = toPublicUrl(await minioClient.presignedPutObject(
        VOXORA_BUCKET,
        fileKey,
        expiresIn,
      ));
      // 7-day presigned download URL so clients open files directly from MinIO
      const downloadUrl = toPublicUrl(await minioClient.presignedGetObject(
        VOXORA_BUCKET,
        fileKey,
        604800,
      ));
      logger.info(`Generated conversation upload URL for: ${fileName}`);
      return { uploadUrl, downloadUrl, fileKey, fileName, expiresIn };
    } catch (error) {
      logger.error("Error generating conversation upload URL:", error);
      throw new Error("Failed to generate upload URL");
    }
  }

  async generatePresignedDownloadUrl(
    fileKey: string,
    expiresIn: number = 3600,
  ): Promise<string> {
    try {
      const downloadUrl = toPublicUrl(await minioClient.presignedGetObject(
        VOXORA_BUCKET,
        fileKey,
        expiresIn,
      ));

      logger.info(`Generated presigned download URL for: ${fileKey}`);
      return downloadUrl;
    } catch (error) {
      logger.error("Error generating presigned download URL:", error);
      throw new Error("Failed to generate download URL");
    }
  }

  async deleteFile(fileKey: string): Promise<void> {
    try {
      await minioClient.removeObject(VOXORA_BUCKET, fileKey);
      logger.info(`Deleted file from storage: ${fileKey}`);
    } catch (error) {
      logger.error("Error deleting file:", error);
      throw new Error("Failed to delete file");
    }
  }

  async getFileMetadata(fileKey: string): Promise<any> {
    try {
      const stat = await minioClient.statObject(VOXORA_BUCKET, fileKey);
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
    try {
      await minioClient.statObject(VOXORA_BUCKET, fileKey);
      return true;
    } catch (error) {
      return false;
    }
  }

  async listFiles(prefix: string = "knowledge/"): Promise<string[]> {
    try {
      const objectsList: string[] = [];
      const stream = minioClient.listObjects(VOXORA_BUCKET, prefix, true);

      return new Promise((resolve, reject) => {
        stream.on("data", (obj) => {
          if (obj.name) {
            objectsList.push(obj.name);
          }
        });
        stream.on("error", (err) => {
          logger.error("Error listing files:", err);
          reject(err);
        });
        stream.on("end", () => {
          resolve(objectsList);
        });
      });
    } catch (error) {
      logger.error("Error listing files:", error);
      throw new Error("Failed to list files");
    }
  }
}

export default new StorageService();
