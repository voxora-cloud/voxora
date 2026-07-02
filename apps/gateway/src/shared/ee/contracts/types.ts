import { Organization } from "@shared/models";
import { PlanTier } from "../licensing/policy";

export type SubscriptionAction = "activate" | "renew" | "past_due" | "cancel" | "expire" | "unknown";

export type ParsedSubscriptionEvent = {
  provider: string;
  eventId: string;
  eventType: string;
  action: SubscriptionAction;
  subscriptionId?: string;
  organizationId?: string;
  targetPlan?: "pro" | "proplus";
  currentPeriodEnd?: Date;
};

/**
 * The contract type that the dynamically loaded `ee/index.js` module must satisfy.
 * Validated at runtime by `validateEeModuleContract` inside `loader.ts`.
 */
export type EeModule = {
  contractVersion?: string;
  billing?: {
    createPortalSession?: (params: {
      organizationId: string;
      userId: string;
      targetPlan?: "pro" | "proplus";
    }) => Promise<{
      url: string;
      provider?: string;
    }>;
    verifyWebhookSignature?: (params: {
      headers: Record<string, string | string[] | undefined>;
      rawBody: string;
    }) => {
      isValid: boolean;
      reason?: string;
    };
    parseSubscriptionEvent?: (params: {
      body: unknown;
      headers?: Record<string, string | string[] | undefined>;
    }) => ParsedSubscriptionEvent;
    handleSubscriptionEvent?: (params: {
      action: SubscriptionAction;
      organizationId?: string;
      subscriptionId?: string;
      targetPlan?: PlanTier;
      currentPeriodEnd?: Date;
      core: {
        OrganizationModel: typeof Organization;
        BillingSubscriptionModel: unknown;
      };
    }) => Promise<{ action: string; plan?: string }>;
    /** @deprecated Use handleSubscriptionEvent */
    upgradePlan?: (params: {
      organizationId: string;
      targetPlan: PlanTier;
      core: { OrganizationModel: typeof Organization };
    }) => Promise<{ plan: PlanTier }>;
  };
  contacts?: {
    beforeListContacts?: (params: { organizationId: string }) => Promise<void>;
  };
};
