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

/**
 * @openapi
 * /conversations/ai/{conversationId}/memory:
 *   get:
 *     summary: Retrieve message history memory for AI context builder
 *     tags:
 *       - Conversations
 *     parameters:
 *       - in: header
 *         name: x-ai-tool-secret
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Memory retrieved successfully
 */
router.get(
  "/ai/:conversationId/memory",
  validateAiSecret,
  ConversationController.aiGetMemory,
);

/**
 * @openapi
 * /conversations/ai/{conversationId}/gate:
 *   get:
 *     summary: Check conversation gate constraints (e.g. if routing to human is required)
 *     tags:
 *       - Conversations
 *     parameters:
 *       - in: header
 *         name: x-ai-tool-secret
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Gate status retrieved successfully
 */
router.get(
  "/ai/:conversationId/gate",
  validateAiSecret,
  ConversationController.aiGetConversationGate,
);

/**
 * @openapi
 * /conversations/ai/{conversationId}/resolve:
 *   post:
 *     summary: Mark conversation resolved by AI agent
 *     tags:
 *       - Conversations
 *     parameters:
 *       - in: header
 *         name: x-ai-tool-secret
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Conversation marked resolved
 */
router.post(
  "/ai/:conversationId/resolve",
  validateAiSecret,
  ConversationController.aiResolveConversation,
);

/**
 * @openapi
 * /conversations/ai/{conversationId}/escalate:
 *   post:
 *     summary: Escalate a conversation to a human support agent
 *     tags:
 *       - Conversations
 *     parameters:
 *       - in: header
 *         name: x-ai-tool-secret
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Conversation escalated to human backlog
 */
router.post(
  "/ai/:conversationId/escalate",
  validateAiSecret,
  ConversationController.aiEscalate,
);

/**
 * @openapi
 * /conversations/ai/{conversationId}/agent-runs:
 *   post:
 *     summary: Log a run of the AI agent
 *     tags:
 *       - Conversations
 *     parameters:
 *       - in: header
 *         name: x-ai-tool-secret
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *         description: Agent run logged successfully
 */
router.post(
  "/ai/:conversationId/agent-runs",
  validateAiSecret,
  ConversationController.aiSaveAgentRun,
);

// ─── Agent Dashboard Routes (JWT required) ───────────────────────────────────

// All agent dashboard conversation routes require org context.
router.use(auth, resolveOrganization, requireRole("agent"));

/**
 * @openapi
 * /conversations:
 *   get:
 *     summary: Get all conversations for an agent in the organization
 *     tags:
 *       - Conversations
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved list of conversations
 */
router.get("/", ConversationController.getConversations);

/**
 * @openapi
 * /conversations/{conversationId}:
 *   get:
 *     summary: Get a specific conversation with all message history
 *     tags:
 *       - Conversations
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Conversation details retrieved successfully
 *       404:
 *         description: Conversation not found
 */
router.get(
  "/:conversationId",
  ConversationController.getConversationById,
);

/**
 * @openapi
 * /conversations/{conversationId}/status:
 *   patch:
 *     summary: Update conversation status
 *     tags:
 *       - Conversations
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *     responses:
 *       200:
 *         description: Status updated successfully
 */
router.patch(
  "/:conversationId/status",
  ConversationController.updateConversationStatus,
);

/**
 * @openapi
 * /conversations/{conversationId}/visitor:
 *   patch:
 *     summary: Update visitor contact details associated with the conversation session
 *     tags:
 *       - Conversations
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *     responses:
 *       200:
 *         description: Visitor details updated successfully
 */
router.patch(
  "/:conversationId/visitor",
  validateRequest(conversationSchema.updateVisitor),
  ConversationController.updateVisitorInfo,
);

/**
 * @openapi
 * /conversations/{conversationId}/route:
 *   post:
 *     summary: Route conversation to a specific support team or human agent
 *     tags:
 *       - Conversations
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               assignedTo:
 *                 type: string
 *               teamId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Conversation routed successfully
 */
router.post(
  "/:conversationId/route",
  ConversationController.routeConversation,
);

/**
 * @openapi
 * /conversations/{conversationId}/agent-runs:
 *   get:
 *     summary: Get agent run history for a conversation
 *     tags:
 *       - Conversations
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: History retrieved successfully
 */
router.get(
  "/:conversationId/agent-runs",
  ConversationController.getAgentRuns,
);

export default router;

