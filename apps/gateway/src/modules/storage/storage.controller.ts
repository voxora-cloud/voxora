import { Request, Response } from "express";
import StorageService from "./storage.service";
import logger from "@shared/core/logger";
import { AuthenticatedRequest } from "@shared/security/middleware/auth";

const getOrgId = (req: Request): string => (req as AuthenticatedRequest).user.activeOrganizationId;

// Helper to ensure param is string (not string array)
const getParamAsString = (param: string | string[] | undefined): string => {
  if (Array.isArray(param)) return param[0];
  return param || "";
};

export const storageController = {
  async getPublicUrl(req: Request, res: Response): Promise<void> {
    const objectKey = req.params.objectKey as string;

    if (!objectKey) {
      res.status(400).json({ error: "Object key is required" });
      return;
    }

    try {
      const url = StorageService.getPublicUrl(objectKey);
      res.status(200).json({
        success: true,
        message: "Public URL generated",
        data: { url, objectKey, bucket: StorageService.getBucketName() },
      });
    } catch (error) {
      logger.error(`Error generating public URL:`, error);
      res.status(500).json({ error: "Failed to generate public URL" });
    }
  },

  async generateUploadUrl(req: Request, res: Response): Promise<void> {
    try {
      const orgId = getOrgId(req);
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
        orgId,
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
      const orgId = getOrgId(req);
      const { fileKey, expiresIn } = req.body;

      if (!fileKey) {
        res.status(400).json({ error: "fileKey is required" });
        return;
      }

      const isOwner = await StorageService.verifyKeyOwnership(fileKey, orgId);
      if (!isOwner) {
        res.status(403).json({ error: "Access denied" });
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
      const orgId = getOrgId(req);
      const fileKey = getParamAsString(req.params.fileKey);

      if (!fileKey) {
        res.status(400).json({ error: "fileKey is required" });
        return;
      }

      const decodedKey = decodeURIComponent(fileKey);

      const isOwner = await StorageService.verifyKeyOwnership(decodedKey, orgId);
      if (!isOwner) {
        res.status(403).json({ error: "Access denied" });
        return;
      }

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
      const orgId = getOrgId(req);
      const fileKey = getParamAsString(req.params.fileKey);

      if (!fileKey) {
        res.status(400).json({ error: "fileKey is required" });
        return;
      }

      const decodedKey = decodeURIComponent(fileKey);

      const isOwner = await StorageService.verifyKeyOwnership(decodedKey, orgId);
      if (!isOwner) {
        res.status(403).json({ error: "Access denied" });
        return;
      }

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
      const { contentType, stream } = await StorageService.getProxyFilePayload(fileKey);
      res.setHeader("Content-Type", contentType);
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      // Allow cross-origin embedding (iframes on different origins loading this image).
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
      stream.pipe(res);
    } catch (err: any) {
      logger.warn(`proxyFile: object not found for key=${fileKey}`);
      res.status(404).json({ error: "File not found" });
    }
  },
};
