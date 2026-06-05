import logger from "@shared/core/logger";
import { EeFeature, PlanTier, InteraOneMode } from "../licensing/policy";

interface EeAuditEvent {
  event: "ee_access_allowed" | "ee_access_denied" | "ee_contract_warning";
  feature?: EeFeature;
  organizationId?: string;
  userId?: string;
  mode?: InteraOneMode;
  reason?: string;
  currentPlan?: PlanTier;
  requiredPlan?: PlanTier;
}

export const logEeAuditEvent = (payload: EeAuditEvent): void => {
  logger.info("EE audit event", payload);
};
