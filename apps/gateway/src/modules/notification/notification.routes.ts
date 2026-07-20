import { Router } from "express";
import NotificationController from "./notification.controller";
import { authenticate, resolveOrganization } from "@shared/security/middleware/auth";
import { validateAiSecret } from "@shared/security/middleware";

const router = Router({ mergeParams: true });

// ─── AI-Internal Routes (x-ai-tool-secret, no JWT) ──────────────────────────

/**
 * @openapi
 * /notifications/ai:
 *   post:
 *     summary: Create a notification from AI context
 *     tags:
 *       - Notifications
 *     parameters:
 *       - in: header
 *         name: x-ai-tool-secret
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Notification created successfully
 */
router.post("/ai", validateAiSecret, NotificationController.aiCreate.bind(NotificationController));

// ─── Agent Dashboard Routes (JWT required) ───────────────────────────────────

router.use(authenticate, resolveOrganization);

/**
 * @openapi
 * /notifications:
 *   get:
 *     summary: Retrieve notifications list for current user
 *     tags:
 *       - Notifications
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Notifications list retrieved successfully
 */
router.get("/", NotificationController.getNotifications);

export default router;
