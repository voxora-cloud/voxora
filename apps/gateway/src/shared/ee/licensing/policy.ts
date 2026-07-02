export type InteraOneMode = "cloud" | "self-host";
export type PlanTier = "free" | "pro" | "proplus";
export type EeFeature = "billing";
export type PlanLimitKey = "messages" | "humanAgents" | "contacts" | "knowledgeItems";

export interface PlanDefinition {
  plan: PlanTier;
  priceMonthlyUsd: number;
  summary: string;
  features: string[];
  limits: Record<PlanLimitKey, number | null>;
}

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
};

export const OSS_CORE_CAPABILITIES: string[] = [
  "Realtime inbox and conversations",
  "Website chat widget",
  "Basic AI assistance",
  "Agent management",
  "Knowledge base",
  "Organization and role management",
];

export const PLAN_DEFINITIONS: Record<PlanTier, PlanDefinition> = {
  free: {
    plan: "free",
    priceMonthlyUsd: 0,
    summary: "Starter plan for small support workflows.",
    features: [
      "Everything in OSS core",
      "InteraOne branding",
    ],
    limits: {
      messages: 50,
      humanAgents: 1,
      contacts: 10,
      knowledgeItems: 10,
    },
  },
  pro: {
    plan: "pro",
    priceMonthlyUsd: 9,
    summary: "Built for growing support teams.",
    features: [
      "InteraOne branding",
      "Standard email support",
    ],
    limits: {
      messages: 500,
      humanAgents: 2,
      contacts: 500,
      knowledgeItems: 100,
    },
  },
  proplus: {
    plan: "proplus",
    priceMonthlyUsd: 39,
    summary: "High-volume plan for fast scaling teams.",
    features: [
      "InteraOne branding",
      "Priority support",
    ],
    limits: {
      messages: 5000,
      humanAgents: 10,
      contacts: 10000,
      knowledgeItems: 1000,
    },
  },
};
