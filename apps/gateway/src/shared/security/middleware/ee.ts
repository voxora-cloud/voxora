import { Request, Response, NextFunction } from "express";
import { AuthenticatedRequest } from "./auth";
import {
  EeFeature,
  canAccessFeatureByPlan,
  getEeStatus,
  getRequiredPlanForFeature,
  isFeatureEnabledForMode,
  resolveOrganizationPlan,
  logEeAuditEvent,
} from "@shared/ee";

export const requireEeAvailable = () => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const ee = getEeStatus();
    if (!ee.isAvailable) {
      const user = (req as AuthenticatedRequest).user;
      logEeAuditEvent({
        event: "ee_access_denied",
        organizationId: user?.activeOrganizationId,
        userId: user?.userId,
        mode: ee.mode,
        reason: ee.mode === "self-host" ? "disabled_by_mode" : "module_or_env_unavailable",
      });

      res.status(403).json({
        success: false,
        message: "Upgrade required",
        data: {
          reason: ee.mode === "self-host" ? "EE disabled for self-host mode" : "EE module not available",
        },
      });
      return;
    }

    next();
  };
};

export const requireEeFeature = (feature: EeFeature) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const ee = getEeStatus();
    if (!isFeatureEnabledForMode(feature, ee.mode) || !ee.isAvailable) {
      const user = (req as AuthenticatedRequest).user;
      logEeAuditEvent({
        event: "ee_access_denied",
        feature,
        organizationId: user?.activeOrganizationId,
        userId: user?.userId,
        mode: ee.mode,
        reason: ee.mode === "self-host" ? "disabled_by_mode" : "module_or_env_unavailable",
        requiredPlan: getRequiredPlanForFeature(feature),
      });

      res.status(403).json({
        success: false,
        message: "Upgrade required",
        data: {
          reason: ee.mode === "self-host" ? "EE disabled for self-host mode" : "EE module not available",
          requiredPlan: getRequiredPlanForFeature(feature),
        },
      });
      return;
    }

    const organizationId = (req as AuthenticatedRequest).user?.activeOrganizationId;
    if (!organizationId) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }

    const plan = await resolveOrganizationPlan(organizationId);
    const allowed = canAccessFeatureByPlan(plan, feature);

    if (!allowed) {
      logEeAuditEvent({
        event: "ee_access_denied",
        feature,
        organizationId,
        userId: (req as AuthenticatedRequest).user?.userId,
        mode: ee.mode,
        reason: "plan_too_low",
        currentPlan: plan,
        requiredPlan: getRequiredPlanForFeature(feature),
      });

      res.status(403).json({
        success: false,
        message: "Upgrade required",
        data: {
          currentPlan: plan,
          requiredPlan: getRequiredPlanForFeature(feature),
          feature,
        },
      });
      return;
    }

    logEeAuditEvent({
      event: "ee_access_allowed",
      feature,
      organizationId,
      userId: (req as AuthenticatedRequest).user?.userId,
      mode: ee.mode,
      currentPlan: plan,
      requiredPlan: getRequiredPlanForFeature(feature),
    });

    next();
  };
};
