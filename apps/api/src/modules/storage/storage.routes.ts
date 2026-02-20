import { Router, Request, Response } from "express";
import { storageController } from "./storage.controller";
import { authenticate } from "@shared/middleware";
import { minioClient, VOXORA_BUCKET } from "@shared/config/minio";
import { asyncHandler, sendError, sendResponse } from "@shared/utils/response";
import logger from "@shared/utils/logger";

const router = Router();

/**
 * Get public URL for a MinIO object (no auth required for public access)
 * GET /api/v1/storage/public-url/:objectKey
 */
router.get(
  "/public-url/:objectKey",
  asyncHandler(async (req: Request, res: Response) => {
    const { objectKey } = req.params;

    if (!objectKey) {
      return sendError(res, 400, "Object key is required");
    }

    try {
      const minioEndpoint = process.env.MINIO_ENDPOINT || "localhost";
      const minioPort = process.env.MINIO_PORT || "9001";
      const useSSL = process.env.MINIO_USE_SSL === "true";
      const protocol = useSSL ? "https" : "http";

      const publicUrl = `${protocol}://${minioEndpoint}:${minioPort}/${VOXORA_BUCKET}/${objectKey}`;

      sendResponse(res, 200, true, "Public URL generated", {
        url: publicUrl,
        objectKey,
        bucket: VOXORA_BUCKET,
      });
    } catch (error: any) {
      logger.error(`Error generating public URL: ${error.message}`);
      sendError(res, 500, "Failed to generate public URL");
    }
  }),
);

// Apply authentication to all routes below
router.use(authenticate);

router.post("/presigned-upload", storageController.generateUploadUrl);
router.post("/presigned-download", storageController.generateDownloadUrl);
router.get("/files", storageController.listFiles);
router.get("/metadata/:fileKey", storageController.getFileMetadata);
router.delete("/:fileKey", storageController.deleteFile);

export default router;
