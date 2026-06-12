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

router.patch("/ai/:documentId/status", validateAiSecret, aiUpdateDocStatus);
router.get("/ai/:documentId/sync-info", validateAiSecret, aiGetSyncInfo);

// ─── Admin Dashboard Routes (JWT required) ───────────────────────────────────

router.use(authenticate);
router.use(requireRole("admin"));

router.get("/", getKnowledgeItems);
router.post("/request-upload", validateRequest(knowledgeSchema.requestUpload), requireWithinLimit("knowledgeItems"), requestFileUpload);
router.post("/", validateRequest(knowledgeSchema.createText), requireWithinLimit("knowledgeItems"), createTextKnowledge);
router.post("/:documentId/confirm", confirmUpload);
router.post("/:documentId/reindex", reindexKnowledge);
router.get("/:documentId/view-url", getViewUrl);
router.patch("/:documentId", updateKnowledge);
router.delete("/:documentId", deleteKnowledge);

export default router;
