import { Request, Response } from "express";
import StorageService from "./storage.service";
import { VOXORA_BUCKET } from "@shared/config/minio";
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
};
