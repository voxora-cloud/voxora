import { Router } from "express";
import * as ConversationController from "./conversation.controller";
import {
  authenticate as auth,
  resolveOrganization,
  requireRole,
  validateRequest,
  validateAiSecret,
} from "@shared/security/middleware";
import { conversationSchema } from "./conversation.schema";

const router = Router();

// ─── AI-Internal Routes (x-ai-tool-secret, no JWT) ──────────────────────────

router.get(
  "/ai/:conversationId/memory",
  validateAiSecret,
  ConversationController.aiGetMemory,
);

router.get(
  "/ai/:conversationId/gate",
  validateAiSecret,
  ConversationController.aiGetConversationGate,
);

router.post(
  "/ai/:conversationId/resolve",
  validateAiSecret,
  ConversationController.aiResolveConversation,
);

router.post(
  "/ai/:conversationId/escalate",
  validateAiSecret,
  ConversationController.aiEscalate,
);

// ─── Agent Dashboard Routes (JWT required) ───────────────────────────────────

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

