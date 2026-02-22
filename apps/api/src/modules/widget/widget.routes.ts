import { Router } from "express";
import * as WidgetController from "./widget.controller";
import { validateRequest, authenticateWidget } from "@shared/middleware";
import { widgetSchema } from "./widget.schema";

const router = Router();

// Widget auth
router.post("/auth/token", WidgetController.generateWidgetToken);
router.post("/auth/validate", authenticateWidget, WidgetController.validateWidgetToken);

// Public config fetch for widget rendering on end-user sites
router.get("/config", WidgetController.getWidgetConfig);

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
router.post("/upload-url", authenticateWidget, WidgetController.getUploadUrl);

// Soft-delete (close) a conversation — visitor can only delete their own
router.delete(
  "/conversations/:conversationId",
  authenticateWidget,
  WidgetController.deleteConversation,
);

export default router;
