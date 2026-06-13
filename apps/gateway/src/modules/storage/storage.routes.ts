import { Router } from "express";
import { storageController } from "./storage.controller";
import { authenticate, validateRequest } from "@shared/security/middleware";
import { storageSchema } from "./storage.schema";

const router = Router();

// Get public URL for a MinIO object (no auth required)

/**
 * @openapi
 * /storage/public-url/{objectKey}:
 *   get:
 *     summary: Retrieve the public URL for a MinIO object
 *     tags:
 *       - Storage
 *     parameters:
 *       - in: path
 *         name: objectKey
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Public object URL retrieved successfully
 */
router.get(
	"/public-url/:objectKey",
	validateRequest(storageSchema.publicUrlParams, "params"),
	storageController.getPublicUrl,
);

// Public proxy — streams a MinIO object through the API (no auth).
// Used so browsers never need to reach the internal MinIO hostname.

/**
 * @openapi
 * /storage/file:
 *   get:
 *     summary: Stream a file through proxy from MinIO storage
 *     tags:
 *       - Storage
 *     parameters:
 *       - in: query
 *         name: fileKey
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: File streamed successfully
 */
router.get(
	"/file",
	validateRequest(storageSchema.proxyFileQuery, "query"),
	storageController.proxyFile,
);

// Apply authentication to all routes below
router.use(authenticate);

/**
 * @openapi
 * /storage/presigned-upload:
 *   post:
 *     summary: Generate a presigned upload URL for direct storage push
 *     tags:
 *       - Storage
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fileName
 *               - fileType
 *             properties:
 *               fileName:
 *                 type: string
 *               fileType:
 *                 type: string
 *     responses:
 *       200:
 *         description: Presigned upload URL generated successfully
 */
router.post(
	"/presigned-upload",
	validateRequest(storageSchema.presignedUpload),
	storageController.generateUploadUrl,
);

/**
 * @openapi
 * /storage/presigned-download:
 *   post:
 *     summary: Generate a presigned download URL for private files
 *     tags:
 *       - Storage
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fileKey
 *             properties:
 *               fileKey:
 *                 type: string
 *     responses:
 *       200:
 *         description: Presigned download URL generated successfully
 */
router.post(
	"/presigned-download",
	validateRequest(storageSchema.presignedDownload),
	storageController.generateDownloadUrl,
);



/**
 * @openapi
 * /storage/metadata/{fileKey}:
 *   get:
 *     summary: Get metadata details for a specific file key
 *     tags:
 *       - Storage
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: fileKey
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: File metadata details retrieved successfully
 */
router.get(
	"/metadata/:fileKey",
	validateRequest(storageSchema.fileKeyParams, "params"),
	storageController.getFileMetadata,
);

/**
 * @openapi
 * /storage/{fileKey}:
 *   delete:
 *     summary: Delete a file from storage bucket
 *     tags:
 *       - Storage
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: fileKey
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: File deleted successfully
 */
router.delete(
	"/:fileKey",
	validateRequest(storageSchema.fileKeyParams, "params"),
	storageController.deleteFile,
);

export default router;
