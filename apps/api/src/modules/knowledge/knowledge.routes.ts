import { Router } from "express";
import { authenticate, authorize } from "@shared/middleware";
import { validateRequest } from "@shared/middleware/validation";
import {
  getKnowledgeItems,
  requestFileUpload,
  confirmUpload,
  createTextKnowledge,
  getViewUrl,
  deleteKnowledge,
} from "./knowledge.controller";
import { knowledgeSchema } from "./knowledge.schema";

const router = Router();

router.use(authenticate);
router.use(authorize(["admin"]));

router.get("/", getKnowledgeItems);
router.post("/request-upload", validateRequest(knowledgeSchema.requestUpload), requestFileUpload);
router.post("/:documentId/confirm", confirmUpload);
router.get("/:documentId/view-url", getViewUrl);
router.delete("/:documentId", deleteKnowledge);
router.post("/", validateRequest(knowledgeSchema.createText), createTextKnowledge);

export default router;
