import { Router } from 'express';
import { Request, Response } from 'express';
import { storageController } from '../controllers/storageController';
import { authenticate } from '../middleware/auth';
import { minioClient, VOXORA_BUCKET } from "../config/minio";
import { asyncHandler, sendError, sendResponse } from "../utils/response";
import logger from "../utils/logger";

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
      // Generate public URL
      const minioEndpoint = process.env.MINIO_ENDPOINT || 'localhost';
      const minioPort = process.env.MINIO_PORT || '9001';
      const useSSL = process.env.MINIO_USE_SSL === 'true';
      const protocol = useSSL ? 'https' : 'http';
      
      const publicUrl = `${protocol}://${minioEndpoint}:${minioPort}/${VOXORA_BUCKET}/${objectKey}`;

      sendResponse(res, 200, true, "Public URL generated", {
        url: publicUrl,
        objectKey,
        bucket: VOXORA_BUCKET
      });
    } catch (error: any) {
      logger.error(`Error generating public URL: ${error.message}`);
      sendError(res, 500, "Failed to generate public URL");
    }
  })
);

// Apply authentication to all routes below
router.use(authenticate);

router.post('/presigned-upload', storageController.generateUploadUrl);
router.post('/presigned-download', storageController.generateDownloadUrl);
router.get('/files', storageController.listFiles);
router.get('/metadata/:fileKey', storageController.getFileMetadata);
router.delete('/:fileKey', storageController.deleteFile);

export default router;

