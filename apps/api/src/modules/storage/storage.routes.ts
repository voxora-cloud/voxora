import { Router } from "express";
import { storageController } from "./storage.controller";
import { authenticate } from "@shared/middleware";

const router = Router();

// Get public URL for a MinIO object (no auth required)
router.get("/public-url/:objectKey", storageController.getPublicUrl);

// Public proxy — streams a MinIO object through the API (no auth).
// Used so browsers never need to reach the internal MinIO hostname.
router.get("/file", storageController.proxyFile);

// Apply authentication to all routes below
router.use(authenticate);

router.post("/presigned-upload", storageController.generateUploadUrl);
router.post("/presigned-download", storageController.generateDownloadUrl);
router.get("/files", storageController.listFiles);
router.get("/metadata/:fileKey", storageController.getFileMetadata);
router.delete("/:fileKey", storageController.deleteFile);

export default router;
