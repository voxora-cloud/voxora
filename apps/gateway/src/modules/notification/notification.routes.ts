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

/**
 * @openapi
 * /notifications/read-all:
 *   patch:
 *     summary: Mark all notifications as read for current user
 *     tags:
 *       - Notifications
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: All notifications marked read
 */
router.patch("/read-all", NotificationController.markAllAsRead);

/**
 * @openapi
 * /notifications/{id}/read:
 *   patch:
 *     summary: Mark a specific notification as read by ID
 *     tags:
 *       - Notifications
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Notification marked read
 */
router.patch("/:id/read", NotificationController.markAsRead);

export default router;