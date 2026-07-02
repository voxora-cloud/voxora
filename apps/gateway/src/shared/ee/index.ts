/**
 * Sub-module responsibilities:
 *   contracts/types.ts       — EeModule contract type (shape of the /ee JS plugin)
 *   licensing/policy.ts      — Plan tiers, feature policy, plan definitions
 *   audit/audit.ts           — Structured audit logging for EE access events
 *   loader/env.ts            — Deployment mode detection + license key validation
 *   loader/loader.ts         — Dynamic require() of /ee, contract validation, status
 *   licensing/plan.ts        — Plan cache, resolution, catalog, limits
 *   licensing/entitlements.ts— Feature gating and entitlements payload
 */

// Types
export type { EeModule } from "./contracts/types";
export type { EeFeature, PlanTier, InteraOneMode, PlanDefinition, PlanLimitKey } from "./licensing/policy";

// Policy constants
export { EE_FEATURE_POLICY, PLAN_WEIGHT, PLAN_DEFINITIONS, OSS_CORE_CAPABILITIES } from "./licensing/policy";

// Audit
export { logEeAuditEvent } from "./audit/audit";

// Environment / mode
export { getInteraOneMode, isEeEnabledByEnv } from "./loader/env";

// Loader & status
export { isEeModulePresent, getEeStatus, loadEeModule, preflightEeContractCheck } from "./loader/loader";

// Plan
export { normalizePlan, resolveOrganizationPlan, invalidateOrganizationPlanCache, getPlanCatalog, getPlanLimits } from "./licensing/plan";

// Entitlements
export { isFeatureEnabledForMode, canAccessFeatureByPlan, getRequiredPlanForFeature, resolvePlanEntitlements } from "./licensing/entitlements";
