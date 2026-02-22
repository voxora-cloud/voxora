import { Request, Response } from "express";
import StorageService from "./storage.service";
import { minioClient, VOXORA_BUCKET } from "@shared/config/minio";
import logger from "@shared/utils/logger";

// Helper to ensure param is string (not string array)
const getParamAsString = (param: string | string[] | undefined): string => {
  if (Array.isArray(param)) return param[0];
  return param || "";
};

export const storageController = {
  async getPublicUrl(req: Request, res: Response): Promise<void> {
    const { objectKey } = req.params;

    if (!objectKey) {
      res.status(400).json({ error: "Object key is required" });
      return;
    }

    try {
      const url = StorageService.getPublicUrl(objectKey);
      res.status(200).json({
        success: true,
        message: "Public URL generated",
        data: { url, objectKey, bucket: VOXORA_BUCKET },
      });
    } catch (error) {
      logger.error(`Error generating public URL:`, error);
      res.status(500).json({ error: "Failed to generate public URL" });
    }
  },

  async generateUploadUrl(req: Request, res: Response): Promise<void> {
    try {
      const { fileName, mimeType, expiresIn } = req.body;

      if (!fileName || !mimeType) {
        res.status(400).json({ error: "fileName and mimeType are required" });
        return;
      }

      const allowedMimeTypes = [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/msword",
        "image/jpeg",
        "image/png",
      ];

      if (!allowedMimeTypes.includes(mimeType)) {
        res.status(400).json({
          error: "Only PDF, DOCX, JPEG, and PNG files are allowed",
        });
        return;
      }

      const result = await StorageService.generatePresignedUploadUrl(
        fileName,
        mimeType,
        expiresIn,
      );

      res
        .status(200)
        .json({ message: "Presigned upload URL generated", data: result });
    } catch (error) {
      logger.error("Error in generateUploadUrl:", error);
      res.status(500).json({ error: "Failed to generate upload URL" });
    }
  },

  async generateConversationUploadUrl(req: Request, res: Response): Promise<void> {
    try {
      const { fileName, mimeType } = req.body;
      if (!fileName || !mimeType) {
        res.status(400).json({ error: "fileName and mimeType are required" });
        return;
      }
      const allowed = [
        "image/jpeg", "image/png", "image/gif", "image/webp",
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/plain",
      ];
      if (!allowed.includes(mimeType)) {
        res.status(400).json({ error: "File type not allowed" });
        return;
      }
      const result = await StorageService.generateConversationUploadUrl(fileName, mimeType);
      res.status(200).json({ success: true, message: "Upload URL generated", data: result });
    } catch (error) {
      logger.error("Error in generateConversationUploadUrl:", error);
      res.status(500).json({ error: "Failed to generate upload URL" });
    }
  },

  async generateDownloadUrl(req: Request, res: Response): Promise<void> {
    try {
      const { fileKey, expiresIn } = req.body;

      if (!fileKey) {
        res.status(400).json({ error: "fileKey is required" });
        return;
      }

      const exists = await StorageService.fileExists(fileKey);
      if (!exists) {
        res.status(404).json({ error: "File not found" });
        return;
      }

      const downloadUrl = await StorageService.generatePresignedDownloadUrl(
        fileKey,
        expiresIn,
      );

      res.status(200).json({
        success: true,
        message: "Presigned download URL generated",
        data: {
          downloadUrl,
          fileKey,
        },
      });
    } catch (error) {
      logger.error("Error in generateDownloadUrl:", error);
      res.status(500).json({ error: "Failed to generate download URL" });
    }
  },

  async deleteFile(req: Request, res: Response): Promise<void> {
    try {
      const fileKey = getParamAsString(req.params.fileKey);

      if (!fileKey) {
        res.status(400).json({ error: "fileKey is required" });
        return;
      }

      const decodedKey = decodeURIComponent(fileKey);

      await StorageService.deleteFile(decodedKey);

      res.status(200).json({
        success: true,
        message: "File deleted successfully",
        data: {
          fileKey: decodedKey,
        },
      });
    } catch (error) {
      logger.error("Error in deleteFile:", error);
      res.status(500).json({ error: "Failed to delete file" });
    }
  },

  async getFileMetadata(req: Request, res: Response): Promise<void> {
    try {
      const fileKey = getParamAsString(req.params.fileKey);

      if (!fileKey) {
        res.status(400).json({ error: "fileKey is required" });
        return;
      }

      const decodedKey = decodeURIComponent(fileKey);
      const metadata = await StorageService.getFileMetadata(decodedKey);

      res.status(200).json({
        message: "File metadata retrieved",
        data: {
          fileKey: decodedKey,
          ...metadata,
        },
      });
    } catch (error) {
      logger.error("Error in getFileMetadata:", error);
      res.status(404).json({ error: "Failed to get file metadata" });
    }
  },

  async listFiles(req: Request, res: Response): Promise<void> {
    try {
      const { prefix } = req.query;
      const files = await StorageService.listFiles(prefix as string | undefined);

      res.status(200).json({
        message: "Files retrieved successfully",
        data: {
          count: files.length,
          files,
        },
      });
    } catch (error) {
      logger.error("Error in listFiles:", error);
      res.status(500).json({ error: "Failed to list files" });
    }
  },

  /**
   * GET /api/v1/storage/file?key=<fileKey>
   * Public proxy: streams the object from MinIO so the browser never needs
   * to reach the internal MinIO host directly.
   */
  async proxyFile(req: Request, res: Response): Promise<void> {
    const fileKey = req.query.key as string | undefined;
    if (!fileKey) {
      res.status(400).json({ error: "key query param is required" });
      return;
    }
    try {
      const stat = await minioClient.statObject(VOXORA_BUCKET, fileKey);
      const contentType =
        (stat.metaData as any)?.["content-type"] ||
        (stat.metaData as any)?.["Content-Type"] ||
        "application/octet-stream";
      res.setHeader("Content-Type", contentType);
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      // Allow cross-origin embedding (iframes on different origins loading this image).
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
      const stream = await minioClient.getObject(VOXORA_BUCKET, fileKey);
      stream.pipe(res);
    } catch (err: any) {
      logger.warn(`proxyFile: object not found for key=${fileKey}`);
      res.status(404).json({ error: "File not found" });
    }
  },
};
