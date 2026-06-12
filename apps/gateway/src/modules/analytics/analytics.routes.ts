import { Router } from "express";
import { AnalyticsController } from "./analytics.controller";
import { authenticate, resolveOrganization, requireRole } from "@shared/security/middleware";

const analyticsRouter = Router();

// Ensure user is authenticated and belongs to the organization
analyticsRouter.use(authenticate, resolveOrganization);

// All authenticated org roles can view analytics
analyticsRouter.get("/owner/summary", requireRole("agent"), AnalyticsController.getOwnerSummary);
analyticsRouter.get("/owner/trends", requireRole("agent"), AnalyticsController.getOwnerTrends);

export { analyticsRouter };