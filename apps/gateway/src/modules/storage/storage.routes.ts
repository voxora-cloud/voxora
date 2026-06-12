import { Router } from "express";
import { storageController } from "./storage.controller";
import { authenticate, validateRequest } from "@shared/security/middleware";
import { storageSchema } from "./storage.schema";

const router = Router();

// Get public URL for a MinIO object (no auth required)
router.get(
	"/public-url/:objectKey",
	validateRequest(storageSchema.publicUrlParams, "params"),
	storageController.getPublicUrl,
);

// Public proxy — streams a MinIO object through the API (no auth).
// Used so browsers never need to reach the internal MinIO hostname.
router.get(
	"/file",
	validateRequest(storageSchema.proxyFileQuery, "query"),
	storageController.proxyFile,
);

// Apply authentication to all routes below
router.use(authenticate);

router.post(
	"/presigned-upload",
	validateRequest(storageSchema.presignedUpload),
	storageController.generateUploadUrl,
);
router.post(
	"/presigned-download",
	validateRequest(storageSchema.presignedDownload),
	storageController.generateDownloadUrl,
);
router.get(
	"/files",
	validateRequest(storageSchema.listFilesQuery, "query"),
	storageController.listFiles,
);
router.get(
	"/metadata/:fileKey",
	validateRequest(storageSchema.fileKeyParams, "params"),
	storageController.getFileMetadata,
);
router.delete(
	"/:fileKey",
	validateRequest(storageSchema.fileKeyParams, "params"),
	storageController.deleteFile,
);

export default router;
