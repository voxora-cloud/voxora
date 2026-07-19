import { Request, Response, NextFunction } from "express";
import { AuthenticatedRequest } from "./auth";
import { resolveOrganizationPlan, getPlanLimits, PlanTier, getInteraOneMode } from "@shared/ee";
import {
  Membership,
  Contact,
  Knowledge,
  UsageRecord,
  BillingSubscription,
} from "@shared/models";
import logger from "@shared/core/logger";

export type LimitKey = "messages" | "humanAgents" | "contacts" | "knowledgeItems";

// ── Current period helpers ────────────────────────────────────────────────────

/** Returns "YYYY-MM" for the current UTC month */
export const currentPeriod = (): string => {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
};

/** Returns the first moment of the next UTC month */
export const nextPeriodStart = (): Date => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
};

/** Resolves period and reset date based on the plan type and subscription */
export const resolveUsagePeriodAndReset = async (
  organizationId: string,
  plan: PlanTier,
): Promise<{ period: string; resetAt: Date }> => {
  if (plan === "free") {
    return {
      period: currentPeriod(),
      resetAt: nextPeriodStart(),
    };
  }

  const subscription = await BillingSubscription.findOne({ organizationId })
    .select("currentPeriodStart currentPeriodEnd")
    .lean<{ currentPeriodStart?: Date; currentPeriodEnd?: Date }>();

  if (subscription?.currentPeriodStart && subscription?.currentPeriodEnd) {
    return {
      period: `paid-${subscription.currentPeriodStart.getTime()}`,
      resetAt: subscription.currentPeriodEnd,
    };
  }

  return {
    period: currentPeriod(),
    resetAt: nextPeriodStart(),
  };
};

// ── Live count resolvers ──────────────────────────────────────────────────────

async function resolveCurrentCount(
  limitKey: LimitKey,
  organizationId: string,
  plan?: PlanTier,
): Promise<number> {
  switch (limitKey) {
    case "messages": {
      const activePlan = plan || (await resolveOrganizationPlan(organizationId));
      const { period } = await resolveUsagePeriodAndReset(organizationId, activePlan);
      const record = await UsageRecord.findOne({ organizationId, period })
        .select("messagesUsed")
        .lean<{ messagesUsed?: number }>();
      return record?.messagesUsed ?? 0;
    }

    case "humanAgents":
      return Membership.countDocuments({
        organizationId,
        role: "agent",
        inviteStatus: { $in: ["accepted", "pending"] },
      });

    case "contacts":
      return Contact.countDocuments({ organizationId });

    case "knowledgeItems":
      return Knowledge.countDocuments({ organizationId });

    default:
      return 0;
  }
}

// ── Limit middleware ──────────────────────────────────────────────────────────

/**
 * Middleware that blocks a request when the org has hit its plan limit for
 * the given resource. Responds with HTTP 429 and a structured payload the
 * frontend can use to show an in-context upgrade prompt.
 *
 * @example
 *   router.post("/agents", requireWithinLimit("humanAgents"), AdminController.inviteAgent);
 */
export const requireWithinLimit = (limitKey: LimitKey) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = (req as AuthenticatedRequest).user;
      const organizationId = user?.activeOrganizationId;

      if (getInteraOneMode() === "self-host") {
        next();
        return;
      }

      if (!organizationId) {
        res.status(401).json({ success: false, message: "Authentication required" });
        return;
      }

      const plan = await resolveOrganizationPlan(organizationId);
      const limits = getPlanLimits(plan);
      const limit = limits[limitKey as keyof typeof limits];

      // null limit = unlimited (enterprise)
      if (limit === null) {
        next();
        return;
      }

      const current = await resolveCurrentCount(limitKey, organizationId, plan);

      if (current >= limit) {
        logger.info(`[Limit] org=${organizationId} plan=${plan} limitKey=${limitKey} current=${current} limit=${limit} — blocked`);

        let nextReset: string | undefined;
        if (limitKey === "messages") {
          const { resetAt } = await resolveUsagePeriodAndReset(organizationId, plan);
          nextReset = resetAt.toISOString();
        }

        res.status(429).json({
          success: false,
          message: `${limitKey} limit reached for your current plan`,
          data: {
            limitType: limitKey,
            currentUsage: current,
            limit,
            plan,
            upgradeRequired: true,
            ...(nextReset ? { resetsAt: nextReset } : {}),
          },
        });
        return;
      }

      next();
    } catch (error: any) {
      logger.error("[Limit middleware] Error checking limit:", error);
      next(); // fail open so a DB error doesn't block legitimate users
    }
  };
};

// ── Usage increment helper (called from socket consumer) ─────────────────────

/**
 * Atomically increments the message counter for the current billing period.
 * Creates the UsageRecord for the period if it doesn't exist yet.
 *
 * Returns the new usage count, or null if the org is on an unlimited plan.
 */
export const incrementMessageUsage = async (
  organizationId: string,
): Promise<{ used: number; limit: number | null; blocked: boolean }> => {
  if (getInteraOneMode() === "self-host") {
    return { used: 0, limit: null, blocked: false };
  }

  const plan = await resolveOrganizationPlan(organizationId);
  const limits = getPlanLimits(plan);
  const limit = limits.messages;

  const { period, resetAt } = await resolveUsagePeriodAndReset(organizationId, plan);

  // Atomically increment (upsert). Returns the updated doc.
  const record = await UsageRecord.findOneAndUpdate(
    { organizationId, period },
    {
      $inc: { messagesUsed: 1 },
      $setOnInsert: { resetAt },
    },
    { upsert: true, new: true },
  );

  const used = record?.messagesUsed ?? 1;

  return {
    used,
    limit,
    blocked: limit !== null && used > limit,
  };
};

// ── Usage snapshot helper (called from the /billing/usage endpoint) ───────────

export interface OrgUsageSnapshot {
  period: string;
  resetsAt: string;
  usage: Record<
    LimitKey,
    { used: number; limit: number | null; pct: number }
  >;
}

export async function getOrganizationUsage(organizationId: string): Promise<OrgUsageSnapshot> {
  const plan = await resolveOrganizationPlan(organizationId);
  const limits = getPlanLimits(plan);
  const { period, resetAt } = await resolveUsagePeriodAndReset(organizationId, plan);

  const [messages, humanAgents, contacts, knowledgeItems] = await Promise.all([
    resolveCurrentCount("messages", organizationId, plan),
    resolveCurrentCount("humanAgents", organizationId, plan),
    resolveCurrentCount("contacts", organizationId, plan),
    resolveCurrentCount("knowledgeItems", organizationId, plan),
  ]);

  const toStat = (used: number, limit: number | null) => ({
    used,
    limit,
    pct: limit === null ? 0 : Math.min(100, Math.round((used / limit) * 100)),
  });

  return {
    period,
    resetsAt: resetAt.toISOString(),
    usage: {
      messages: toStat(messages, limits.messages),
      humanAgents: toStat(humanAgents, limits.humanAgents),
      contacts: toStat(contacts, limits.contacts),
      knowledgeItems: toStat(knowledgeItems, limits.knowledgeItems ?? null),
    },
  };
}

export async function isQuotaExhausted(organizationId: string): Promise<boolean> {
  if (getInteraOneMode() === "self-host") {
    return false;
  }
  const plan = await resolveOrganizationPlan(organizationId);
  const limits = getPlanLimits(plan);
  const limit = limits.messages;
  if (limit === null) return false;

  const used = await resolveCurrentCount("messages", organizationId, plan);
  return used >= limit;
}

