import { minioClient, VOXORA_BUCKET } from "@shared/config/minio";
import { v4 as uuidv4 } from "uuid";
import logger from "@shared/utils/logger";

export interface PresignedUrlResponse {
  uploadUrl: string;
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
  async generatePresignedUploadUrl(
    fileName: string,
    mimeType: string,
    expiresIn: number = 900,
  ): Promise<PresignedUrlResponse> {
    try {
      const fileExtension = fileName.split(".").pop();
      const fileKey = `knowledge/${uuidv4()}.${fileExtension}`;

      const uploadUrl = await minioClient.presignedPutObject(
        VOXORA_BUCKET,
        fileKey,
        expiresIn,
      );

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

  async generatePresignedDownloadUrl(
    fileKey: string,
    expiresIn: number = 3600,
  ): Promise<string> {
    try {
      const downloadUrl = await minioClient.presignedGetObject(
        VOXORA_BUCKET,
        fileKey,
        expiresIn,
      );

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
