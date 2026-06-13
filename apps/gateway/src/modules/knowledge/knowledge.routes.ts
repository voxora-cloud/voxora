import { Router } from "express";
import { authenticate, requireRole, requireWithinLimit, validateAiSecret } from "@shared/security/middleware";
import { validateRequest } from "@shared/security/middleware/validation";
import {
  getKnowledgeItems,
  requestFileUpload,
  confirmUpload,
  createTextKnowledge,
  getViewUrl,
  deleteKnowledge,
  reindexKnowledge,
  updateKnowledge,
  aiUpdateDocStatus,
  aiGetSyncInfo,
} from "./knowledge.controller";
import { knowledgeSchema } from "./knowledge.schema";

const router = Router();

// ─── AI-Internal Routes (x-ai-tool-secret, no JWT) ──────────────────────────

/**
 * @openapi
 * /knowledge/ai/{documentId}/status:
 *   patch:
 *     summary: Update document status from AI worker context
 *     tags:
 *       - Knowledge
 *     parameters:
 *       - in: header
 *         name: x-ai-tool-secret
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Status updated successfully
 */
router.patch("/ai/:documentId/status", validateAiSecret, aiUpdateDocStatus);

/**
 * @openapi
 * /knowledge/ai/{documentId}/sync-info:
 *   get:
 *     summary: Get sync metadata for a document from AI context
 *     tags:
 *       - Knowledge
 *     parameters:
 *       - in: header
 *         name: x-ai-tool-secret
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Sync metadata retrieved successfully
 */
router.get("/ai/:documentId/sync-info", validateAiSecret, aiGetSyncInfo);

// ─── Admin Dashboard Routes (JWT required) ───────────────────────────────────

router.use(authenticate);
router.use(requireRole("admin"));

/**
 * @openapi
 * /knowledge:
 *   get:
 *     summary: Retrieve list of knowledge base items in the organization
 *     tags:
 *       - Knowledge
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of items retrieved successfully
 */
router.get("/", getKnowledgeItems);

/**
 * @openapi
 * /knowledge/request-upload:
 *   post:
 *     summary: Request a presigned upload URL for a document file (PDF, docx, etc.)
 *     tags:
 *       - Knowledge
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
 *               - mimeType
 *             properties:
 *               fileName:
 *                 type: string
 *               mimeType:
 *                 type: string
 *     responses:
 *       200:
 *         description: Presigned upload URL generated successfully
 */
router.post("/request-upload", validateRequest(knowledgeSchema.requestUpload), requireWithinLimit("knowledgeItems"), requestFileUpload);

/**
 * @openapi
 * /knowledge:
 *   post:
 *     summary: Create text-based knowledge base item
 *     tags:
 *       - Knowledge
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - content
 *             properties:
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *     responses:
 *       200:
 *         description: Text knowledge created successfully
 */
router.post("/", validateRequest(knowledgeSchema.createText), requireWithinLimit("knowledgeItems"), createTextKnowledge);

/**
 * @openapi
 * /knowledge/{documentId}/confirm:
 *   post:
 *     summary: Confirm successful upload of file to storage to trigger ingestion
 *     tags:
 *       - Knowledge
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Upload confirmed and ingestion job queued
 */
router.post("/:documentId/confirm", confirmUpload);

/**
 * @openapi
 * /knowledge/{documentId}/reindex:
 *   post:
 *     summary: Re-trigger vector indexing for a document
 *     tags:
 *       - Knowledge
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Re-indexing task queued successfully
 */
router.post("/:documentId/reindex", reindexKnowledge);

/**
 * @openapi
 * /knowledge/{documentId}/view-url:
 *   get:
 *     summary: Get download/view URL for document file attachments
 *     tags:
 *       - Knowledge
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Download URL retrieved successfully
 */
router.get("/:documentId/view-url", getViewUrl);

/**
 * @openapi
 * /knowledge/{documentId}:
 *   patch:
 *     summary: Update knowledge item metadata (e.g. title or text content)
 *     tags:
 *       - Knowledge
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Item updated successfully
 */
router.patch("/:documentId", updateKnowledge);

/**
 * @openapi
 * /knowledge/{documentId}:
 *   delete:
 *     summary: Delete a knowledge item and its vector store contents
 *     tags:
 *       - Knowledge
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Item deleted successfully
 */
router.delete("/:documentId", deleteKnowledge);

export default router;
