import { Router } from "express";
import {
  authenticate,
  resolveOrganization,
  requireRole,
} from "@shared/security/middleware";
import * as TemplatesController from "./templates.controller";

const router = Router();

router.use(authenticate, resolveOrganization);

router.get("/", requireRole("agent"), TemplatesController.getTemplates);
router.post("/", requireRole("admin"), TemplatesController.createTemplate);
router.patch("/:id", requireRole("admin"), TemplatesController.updateTemplate);
router.delete("/:id", requireRole("admin"), TemplatesController.deleteTemplate);

export default router;
