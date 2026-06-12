import {
  EeFeature,
  PlanTier,
  InteraOneMode,
  EE_FEATURE_POLICY,
  PLAN_WEIGHT,
  OSS_CORE_CAPABILITIES,
} from "./policy";
import { getEeStatus } from "../loader/loader";
import { getPlanLimits } from "./plan";

/**
 * Returns `true` if the given feature is enabled for the current deployment mode.
 * For example, billing is only enabled in "cloud" mode.
 */
export const isFeatureEnabledForMode = (feature: EeFeature, mode: InteraOneMode): boolean =>
  EE_FEATURE_POLICY[feature].enabledModes.includes(mode);

/**
 * Returns `true` if the given plan tier meets the minimum requirement for the feature.
 */
export const canAccessFeatureByPlan = (plan: PlanTier, feature: EeFeature): boolean =>
  PLAN_WEIGHT[plan] >= PLAN_WEIGHT[EE_FEATURE_POLICY[feature].requiredPlan];

/**
 * Returns the minimum plan tier required to access a given EE feature.
 */
export const getRequiredPlanForFeature = (feature: EeFeature): PlanTier =>
  EE_FEATURE_POLICY[feature].requiredPlan;

/**
 * Resolves the full entitlements payload for a given plan tier.
 * This is the single response shape returned by `GET /api/v1/org/:id/billing/entitlements`.
 */
export const resolvePlanEntitlements = (plan: PlanTier) => {
  const status = getEeStatus();

  const eeFeatures = (Object.keys(EE_FEATURE_POLICY) as EeFeature[]).reduce(
    (acc, feature) => {
      acc[feature] = {
        enabled:
          status.isAvailable &&
          isFeatureEnabledForMode(feature, status.mode) &&
          canAccessFeatureByPlan(plan, feature),
        requiredPlan: getRequiredPlanForFeature(feature),
      };
      return acc;
    },
    {} as Record<EeFeature, { enabled: boolean; requiredPlan: PlanTier }>,
  );

  return {
    mode: status.mode,
    ee: status,
    plan,
    limits: getPlanLimits(plan),
    ossCoreCapabilities: OSS_CORE_CAPABILITIES,
    eeFeatures,
  };
};
