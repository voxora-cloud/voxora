import { Router } from "express";
import * as AgentController from "./agent.controller";
import { authenticate, requireRole, validateRequest } from "@shared/security/middleware";
import { agentSchema } from "./agent.schema";

const router = Router();

router.use(authenticate);
router.use(requireRole("agent"));

// ** AGENT PROFILE **

/**
 * @openapi
 * /agent/profile:
 *   get:
 *     summary: Get profile for current authenticated agent
 *     tags:
 *       - Agent
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Profile details retrieved successfully
 */
router.get("/profile", AgentController.getProfile);

/**
 * @openapi
 * /agent/profile:
 *   put:
 *     summary: Update profile for current authenticated agent
 *     tags:
 *       - Agent
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated successfully
 */
router.put(
  "/profile",
  validateRequest(agentSchema.updateProfile),
  AgentController.updateProfile,
);

/**
 * @openapi
 * /agent/status:
 *   patch:
 *     summary: Update current agent presence status (online/busy/offline)
 *     tags:
 *       - Agent
 *     security:
 *       - BearerAuth: []
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
 *                 enum: [online, busy, offline]
 *     responses:
 *       200:
 *         description: Status updated successfully
 */
router.patch(
  "/status",
  validateRequest(agentSchema.updateStatus),
  AgentController.updateStatus,
);

/**
 * @openapi
 * /agent/stats:
 *   get:
 *     summary: Get operational stats for the current agent
 *     tags:
 *       - Agent
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Agent statistics retrieved successfully
 */
router.get("/stats", AgentController.getStats);

export default router;
