import { Organization } from "@shared/models";
import { PlanTier, PlanDefinition, PlanLimitKey, PLAN_DEFINITIONS } from "./policy";

const DEFAULT_PLAN: PlanTier = "free";
const PLAN_CACHE_TTL_MS = 60_000;

const planCache = new Map<string, { plan: PlanTier; expiresAt: number }>();

/**
 * Normalises a raw plan string from the database into a valid `PlanTier`.
 * Falls back to `"free"` for any unrecognised or missing values.
 */
export const normalizePlan = (value?: string): PlanTier => {
  const normalized = (value || "").toLowerCase();
  if (normalized === "pro" || normalized === "proplus") {
    return normalized;
  }
  return DEFAULT_PLAN;
};

/**
 * Resolves the active plan for an organisation, using a 60-second in-process
 * cache to avoid a database round-trip on every authenticated request.
 */
export const resolveOrganizationPlan = async (organizationId: string): Promise<PlanTier> => {
  const cached = planCache.get(organizationId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.plan;
  }

  const org = await Organization.findById(organizationId).select("plan").lean<{ plan?: string }>();
  const plan = normalizePlan(org?.plan);
  planCache.set(organizationId, { plan, expiresAt: Date.now() + PLAN_CACHE_TTL_MS });

  return plan;
};

/**
 * Removes the cached plan for an organisation.
 * Must be called after any plan upgrade to ensure the new plan is reflected immediately.
 */
export const invalidateOrganizationPlanCache = (organizationId: string): void => {
  planCache.delete(organizationId);
};

/**
 * Returns the ordered list of all available plan definitions for the pricing page.
 */
export const getPlanCatalog = (): PlanDefinition[] => [
  PLAN_DEFINITIONS.free,
  PLAN_DEFINITIONS.pro,
  PLAN_DEFINITIONS.proplus,
];

/**
 * Returns the resource limits for a given plan tier.
 */
export const getPlanLimits = (plan: PlanTier): Record<PlanLimitKey, number | null> =>
  PLAN_DEFINITIONS[plan].limits;
