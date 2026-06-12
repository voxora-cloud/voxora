import { Router } from "express";
import * as WidgetController from "./widget.controller";
import { validateRequest, authenticateWidget, authenticate, requireRole } from "@shared/security/middleware";
import { widgetSchema } from "./widget.schema";

const router = Router();

// Admin widget management
router.post(
  "/manage",
  authenticate,
  requireRole("admin"),
  validateRequest(widgetSchema.createWidget),
  WidgetController.createWidget,
);
router.get(
  "/manage",
  authenticate,
  requireRole("admin"),
  WidgetController.getWidget,
);
router.put(
  "/manage",
  authenticate,
  requireRole("admin"),
  validateRequest(widgetSchema.updateWidget),
  WidgetController.updateWidget,
);

// Widget auth
router.post("/auth/token", WidgetController.generateWidgetToken);
router.post("/auth/validate", authenticateWidget, WidgetController.validateWidgetToken);

// Public config fetch for widget rendering on end-user sites
router.get("/config", WidgetController.getWidgetConfig);

// Public QR scan tracking
router.post(
  "/qr-scan",
  validateRequest(widgetSchema.qrScan),
  WidgetController.trackQrScan,
);

// Widget conversations
router.post(
  "/conversations",
  authenticateWidget,
  validateRequest(widgetSchema.createConversation),
  WidgetController.initConversation,
);

// Get conversations by sessionId for widget history
router.get(
  "/conversations",
  authenticateWidget,
  WidgetController.getWidgetConversations,
);

// Get messages for a specific conversation
router.get(
  "/conversations/:conversationId/messages",
  authenticateWidget,
  WidgetController.getConversationMessages,
);

// Presigned upload URL for widget file attachments

// Soft-delete (close) a conversation — visitor can only delete their own
router.delete(
  "/conversations/:conversationId",
  authenticateWidget,
  WidgetController.deleteConversation,
);

export default router;