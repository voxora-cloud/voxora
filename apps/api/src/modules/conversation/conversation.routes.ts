import { Router } from "express";
import * as ConversationController from "./conversation.controller";
import {
  authenticate as auth,
  resolveOrganization,
  requireRole,
} from "@shared/middleware";
import { validateRequest } from "@shared/middleware";
import { conversationSchema } from "./conversation.schema";

const router = Router();

// All agent dashboard conversation routes require org context.
router.use(auth, resolveOrganization, requireRole("agent"));

// Get all conversations for an agent
router.get("/", ConversationController.getConversations);

// Get a specific conversation with messages
router.get(
  "/:conversationId",
  ConversationController.getConversationById,
);

// Update conversation status (simple inline version)
router.patch(
  "/:conversationId/status",
  ConversationController.patchStatus,
);

// Update visitor information (public endpoint - no auth required for widget users)
router.patch(
  "/:conversationId/visitor",
  validateRequest(conversationSchema.updateVisitor),
  ConversationController.updateVisitorInfo,
);

// Route conversation to team or agent
router.post(
  "/:conversationId/route",
  ConversationController.routeConversation,
);

// Update conversation status (full version with metadata)
router.patch(
  "/:conversationId/status/full",
  ConversationController.updateConversationStatus,
);

export default router;
