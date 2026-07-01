import { Router } from "express";
import { ObservabilityController } from "./observability.controller";
import {
  authenticate,
  resolveOrganization,
  requireRole,
  validateAiSecret,
} from "@shared/security/middleware";

const observabilityRouter = Router();

// ─── AI-Internal Routes (x-ai-tool-secret, no JWT) ───────────────────────────

/**
 * @openapi
 * /observability/ai-calls:
 *   post:
 *     summary: Ingest a batch of AI call observability events (agent internal)
 *     description: >
 *       Receives batched AICallEvent records from the agent's observability
 *       worker and bulk-inserts them into MongoDB. Protected by the shared
 *       x-ai-tool-secret header — no JWT required.
 *     tags:
 *       - Observability
 *     parameters:
 *       - in: header
 *         name: x-ai-tool-secret
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
 *               - events
 *             properties:
 *               events:
 *                 type: array
 *                 maxItems: 500
 *                 items:
 *                   type: object
 *                   required:
 *                     - timestamp
 *                     - provider
 *                     - modelId
 *                     - callType
 *                     - latencyMs
 *                     - success
 *                   properties:
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                     provider:
 *                       type: string
 *                       example: bedrock
 *                     modelId:
 *                       type: string
 *                     callType:
 *                       type: string
 *                       enum: [llm, embedding]
 *                     latencyMs:
 *                       type: number
 *                     inputTokens:
 *                       type: number
 *                     outputTokens:
 *                       type: number
 *                     totalTokens:
 *                       type: number
 *                     estimatedCostUsd:
 *                       type: number
 *                     success:
 *                       type: boolean
 *                     error:
 *                       type: string
 *                     organizationId:
 *                       type: string
 *                     conversationId:
 *                       type: string
 *     responses:
 *       201:
 *         description: Events ingested successfully
 *       400:
 *         description: Invalid request body
 *       401:
 *         description: Unauthorized (missing or invalid AI tool secret)
 */
observabilityRouter.post(
  "/ai-calls",
  validateAiSecret,
  ObservabilityController.ingestAICalls,
);

// ─── Authenticated Routes (JWT + org membership) ──────────────────────────────

observabilityRouter.use(authenticate, resolveOrganization);

/**
 * @openapi
 * /observability/ai-calls/summary:
 *   get:
 *     summary: Get aggregated AI call metrics for the authenticated organization
 *     tags:
 *       - Observability
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 30
 *         description: Rolling window in days (default 30)
 *     responses:
 *       200:
 *         description: Summary data retrieved successfully
 *       401:
 *         description: Unauthorized
 */
observabilityRouter.get(
  "/ai-calls/summary",
  requireRole("agent"),
  ObservabilityController.getSummary,
);

export { observabilityRouter };
