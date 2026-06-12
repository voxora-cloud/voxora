export type InteraOneMode = "cloud" | "self-host";
export type PlanTier = "free" | "pro" | "proplus";
export type EeFeature = "billing" | "white-label";

export const PLAN_WEIGHT: Record<PlanTier, number> = {
  free: 1,
  pro: 2,
  proplus: 3,
};

export const EE_FEATURE_POLICY: Record<
  EeFeature,
  {
    requiredPlan: PlanTier;
    enabledModes: InteraOneMode[];
  }
> = {
  billing: {
    requiredPlan: "free",
    enabledModes: ["cloud"],
  },
  "white-label": {
    requiredPlan: "proplus",
    enabledModes: ["cloud"],
  },
};
