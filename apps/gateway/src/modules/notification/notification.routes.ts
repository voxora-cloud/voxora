import { Router } from "express";
import NotificationController from "./notification.controller";
import { authenticate, resolveOrganization } from "@shared/security/middleware/auth";
import { validateAiSecret } from "@shared/security/middleware";

const router = Router({ mergeParams: true });

// ─── AI-Internal Routes (x-ai-tool-secret, no JWT) ──────────────────────────

router.post("/ai", validateAiSecret, NotificationController.aiCreate.bind(NotificationController));

// ─── Agent Dashboard Routes (JWT required) ───────────────────────────────────

router.use(authenticate, resolveOrganization);

router.get("/", NotificationController.getNotifications);
router.patch("/read-all", NotificationController.markAllAsRead);
router.patch("/:id/read", NotificationController.markAsRead);

export default router;