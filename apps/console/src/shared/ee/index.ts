import { authApi } from "@/domains/auth/api/auth.api";
import { EE_FEATURE_POLICY, PLAN_WEIGHT } from "./policy";
import type { EeFeature, PlanTier, InteraOneMode } from "./policy";
export type { EeFeature, PlanTier, InteraOneMode } from "./policy";

const env = import.meta.env || {};

export const getInteraOneMode = (): InteraOneMode => {
  const raw = (env.VITE_INTERAONE_MODE || env.INTERAONE_MODE || "self-host").toLowerCase();
  return raw === "cloud" ? "cloud" : "self-host";
};

export const isEeEnabledByEnv = (): boolean => {
  return true;
};

export const normalizePlan = (plan?: string | null): PlanTier => {
  const normalized = (plan || "").toLowerCase();
  if (normalized === "pro" || normalized === "proplus") return normalized;
  return "free";
};

export const getCurrentPlan = (): PlanTier => {
  return normalizePlan(authApi.getOrgPlan());
};

export const getRequiredPlan = (feature: EeFeature): PlanTier => EE_FEATURE_POLICY[feature].requiredPlan;

export const isFeatureEnabledForMode = (feature: EeFeature): boolean => {
  return EE_FEATURE_POLICY[feature].enabledModes.includes(getInteraOneMode());
};

export const canAccessEeFeature = (feature: EeFeature): boolean => {
  if (!isFeatureEnabledForMode(feature)) return false;
  if (!isEeEnabledByEnv()) return false;

  const current = getCurrentPlan();
  return PLAN_WEIGHT[current] >= PLAN_WEIGHT[getRequiredPlan(feature)];
};