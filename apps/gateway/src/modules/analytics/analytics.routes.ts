import { Router } from "express";
import { AnalyticsController } from "./analytics.controller";
import { authenticate, resolveOrganization, requireRole } from "@shared/security/middleware";

const analyticsRouter = Router();

// Ensure user is authenticated and belongs to the organization
analyticsRouter.use(authenticate, resolveOrganization);

// All authenticated org roles can view analytics
analyticsRouter.get("/summary", requireRole("agent"), AnalyticsController.getSummary);
analyticsRouter.get("/trends", requireRole("agent"), AnalyticsController.getTrends);
analyticsRouter.get("/agent/stats", requireRole("agent"), AnalyticsController.getAgentStats);

/**
 * @openapi
 * /analytics/owner/summary:
 *   get:
 *     summary: Retrieve owner summary analytics dashboard data
 *     tags:
 *       - Analytics
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Analytics summary data retrieved successfully
 *       401:
 *         description: Unauthorized
 */
analyticsRouter.get("/owner/summary", requireRole("admin"), AnalyticsController.getOwnerSummary);

/**
 * @openapi
 * /analytics/owner/trends:
 *   get:
 *     summary: Retrieve owner analytics trend metrics over time
 *     tags:
 *       - Analytics
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Analytics trends metrics data retrieved successfully
 *       401:
 *         description: Unauthorized
 */
analyticsRouter.get("/owner/trends", requireRole("admin"), AnalyticsController.getOwnerTrends);

export { analyticsRouter };
