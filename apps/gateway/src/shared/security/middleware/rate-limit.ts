import { Request, Response, NextFunction } from "express";
import { AuthenticatedRequest } from "./auth";
import { resolveOrganizationPlan, getPlanLimits } from "@shared/ee";
import {
  Membership,
  Contact,
  Knowledge,
  UsageRecord,
  Organization,
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

// ── Live count resolvers ──────────────────────────────────────────────────────

async function resolveCurrentCount(
  limitKey: LimitKey,
  organizationId: string,
): Promise<number> {
  switch (limitKey) {
    case "messages": {
      const period = currentPeriod();
      const record = await UsageRecord.findOne({ organizationId, period })
        .select("messagesUsed")
        .lean<{ messagesUsed?: number }>();
      return record?.messagesUsed ?? 0;
    }


    case "humanAgents":
      return Membership.countDocuments({
        organizationId,
        role: "agent",
        inviteStatus: { $in: ["active", "pending"] },
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

      const current = await resolveCurrentCount(limitKey, organizationId);

      if (current >= limit) {
        logger.info(`[Limit] org=${organizationId} plan=${plan} limitKey=${limitKey} current=${current} limit=${limit} — blocked`);

        const nextReset =
          limitKey === "messages" ? nextPeriodStart().toISOString() : undefined;

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
  const plan = await resolveOrganizationPlan(organizationId);
  const limits = getPlanLimits(plan);
  const limit = limits.messages;

  const period  = currentPeriod();
  const resetAt = nextPeriodStart();

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
  const period = currentPeriod();

  const [messages, humanAgents, contacts, knowledgeItems] = await Promise.all([
    resolveCurrentCount("messages", organizationId),
    resolveCurrentCount("humanAgents", organizationId),
    resolveCurrentCount("contacts", organizationId),
    resolveCurrentCount("knowledgeItems", organizationId),
  ]);

  const toStat = (used: number, limit: number | null) => ({
    used,
    limit,
    pct: limit === null ? 0 : Math.min(100, Math.round((used / limit) * 100)),
  });

  return {
    period,
    resetsAt: nextPeriodStart().toISOString(),
    usage: {
      messages:      toStat(messages,      limits.messages),
      humanAgents:   toStat(humanAgents,   limits.humanAgents),
      contacts:      toStat(contacts,      limits.contacts),
      knowledgeItems: toStat(knowledgeItems, limits.knowledgeItems ?? null),
    },
  };
}
