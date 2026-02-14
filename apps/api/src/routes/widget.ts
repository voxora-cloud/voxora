import { Router } from "express";
import {
  generateWidgetToken,
  validateWidgetToken,
  getWidgetConfig,
} from "../controllers/widgetController";
import { validateRequest, authenticateWidget } from "../middleware";
import { conversationValidation, messageValidation } from "../utils/validation";
import { 
  initConversation,
  getWidgetConversations,
  getConversationMessages 
} from "../controllers/conversationController";

const router = Router();

// widget auth
router.post("/auth/token", generateWidgetToken);
router.post("/auth/validate", authenticateWidget, validateWidgetToken);

// public config fetch for widget rendering on end-user sites
router.get("/config", getWidgetConfig);

// widget conversations
router.post(
  "/conversations",
  authenticateWidget,
  validateRequest(conversationValidation.createWidget),
  initConversation,
);

// Get conversations by sessionId for widget history
router.get(
  "/conversations",
  authenticateWidget,
  getWidgetConversations,
);

// Get messages for a specific conversation
router.get(
  "/conversations/:conversationId/messages",
  authenticateWidget,
  getConversationMessages,
);

export default router;
