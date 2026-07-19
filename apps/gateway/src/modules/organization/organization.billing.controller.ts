import { Request, Response } from "express";
import { AuthenticatedRequest, getOrganizationUsage } from "@shared/security/middleware";
import { sendResponse, sendError } from "@shared/core/response";
import logger from "@shared/core/logger";
import {
  getPlanCatalog,
  invalidateOrganizationPlanCache,
  loadEeModule,
  normalizePlan,
  resolvePlanEntitlements,
} from "@shared/ee";
import {
  BillingCheckoutIntent,
  BillingSubscription,
  BillingWebhookEvent,
  Organization,
  Membership,
  User,
} from "@shared/models";
import { enqueueSubscriptionActivatedEmail, enqueueRawEmail } from "@shared/queues/email.queue";

const resolveAndValidateScopedOrgId = (req: Request, res: Response): string | null => {
  const { activeOrganizationId } = (req as AuthenticatedRequest).user;
  const routeOrgId = (req.params?.orgId || "").toString();
  if (routeOrgId && routeOrgId !== activeOrganizationId) {
    sendError(res, 403, "Organization scope mismatch");
    return null;
  }
  return activeOrganizationId;
};

export class OrganizationBillingController {
  static async handleBillingWebhook(req: Request, res: Response): Promise<void> {
    try {
      const ee = loadEeModule();
      if (!ee?.billing) {
        sendResponse(res, 200, true, "EE billing module unavailable; webhook ignored");
        return;
      }

      // 1. Verify signature
      const rawBody = (req as Request & { rawBody?: string }).rawBody;
      if (!rawBody) {
        sendError(res, 400, "Missing raw webhook body");
        return;
      }

      const verifier = ee.billing.verifyWebhookSignature;
      if (!verifier) {
        sendError(res, 501, "Webhook signature verifier not configured");
        return;
      }

      const verification = verifier({ headers: req.headers, rawBody });
      if (!verification.isValid) {
        logger.warn("[Billing Webhook] Signature invalid", { reason: verification.reason });
        sendError(res, 401, verification.reason || "Invalid webhook signature");
        return;
      }

      // 2. Parse subscription event
      const parser = ee.billing.parseSubscriptionEvent;
      if (!parser) {
        sendError(res, 501, "Webhook subscription parser not configured");
        return;
      }

      const parsed = parser({ body: req.body, headers: req.headers });

      const headerEventId = req.headers["webhook-id"] || req.headers["svix-id"];
      const eventId = parsed.eventId || (Array.isArray(headerEventId) ? headerEventId[0] : headerEventId) || "";

      if (!eventId) {
        sendError(res, 400, "Webhook event id is required");
        return;
      }

      // 3. Idempotency guard
      try {
        await BillingWebhookEvent.create({
          provider: parsed.provider || "dodo",
          eventId,
          eventType: parsed.eventType,
          organizationId: parsed.organizationId,
          targetPlan: parsed.targetPlan,
          status: "processing",
          rawPayload: req.body,
        });
      } catch (error: any) {
        if (error?.code === 11000) {
          sendResponse(res, 200, true, "Webhook already processed", { eventId });
          return;
        }
        throw error;
      }

      // 4. Skip unknown / unactionable events
      if (parsed.action === "unknown") {
        await BillingWebhookEvent.updateOne(
          { provider: parsed.provider, eventId },
          { $set: { status: "ignored", processedAt: new Date() } },
        );
        sendResponse(res, 200, true, "Webhook accepted", { eventId, action: "ignored" });
        return;
      }

      if (!parsed.organizationId && !["past_due"].includes(parsed.action)) {
        await BillingWebhookEvent.updateOne(
          { provider: parsed.provider, eventId },
          { $set: { status: "ignored", processedAt: new Date(), errorMessage: "No organizationId in payload" } },
        );
        sendResponse(res, 200, true, "Webhook accepted", { eventId, action: "ignored" });
        return;
      }

      // 5. Dispatch subscription lifecycle handler
      const handler = ee.billing.handleSubscriptionEvent;
      if (!handler) {
        await BillingWebhookEvent.updateOne(
          { provider: parsed.provider, eventId },
          { $set: { status: "failed", errorMessage: "handleSubscriptionEvent not available", processedAt: new Date() } },
        );
        sendError(res, 503, "EE subscription handler unavailable");
        return;
      }

      const result = await handler({
        action: parsed.action,
        organizationId: parsed.organizationId,
        subscriptionId: parsed.subscriptionId,
        targetPlan: parsed.targetPlan,
        currentPeriodEnd: parsed.currentPeriodEnd,
        core: {
          OrganizationModel: Organization,
          BillingSubscriptionModel: BillingSubscription,
        },
      });

      if (parsed.organizationId) {
        invalidateOrganizationPlanCache(parsed.organizationId);
      }

      if (parsed.organizationId) {
        try {
          const ownerMembership = await Membership.findOne({
            organizationId: parsed.organizationId,
            role: "owner",
            inviteStatus: "accepted",
          }).lean();

          if (ownerMembership) {
            const ownerUser = await User.findById(ownerMembership.userId).lean();
            if (ownerUser && ownerUser.email) {
              const planName = parsed.targetPlan ? parsed.targetPlan.toUpperCase() : "PRO";
              const nextBillingDateStr = parsed.currentPeriodEnd
                ? new Date(parsed.currentPeriodEnd).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })
                : "Next Billing Period";
              
              if (parsed.action === "activate") {
                await enqueueSubscriptionActivatedEmail(
                  ownerUser.email,
                  ownerUser.name,
                  planName,
                  nextBillingDateStr
                );
              } else if (parsed.action === "renew") {
                await enqueueRawEmail(
                  ownerUser.email,
                  "Your InteraOne subscription has been renewed",
                  `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e7e1e4; border-radius: 16px; background-color: #ffffff;">
                    <h2 style="color: #845c6c; margin-bottom: 20px;">Subscription Renewed</h2>
                    <p>Hello ${ownerUser.name},</p>
                    <p>Your subscription to the <strong>${planName}</strong> plan has been successfully renewed. Your monthly AI message limits and resource quotas have been reset.</p>
                    <div style="background-color: #fbf8f9; border: 1px solid #e7e1e4; border-radius: 12px; padding: 15px; margin: 20px 0;">
                      <table style="width: 100%; border-collapse: collapse;">
                        <tr><td style="color: #6f6a73; padding-bottom: 5px;">Plan</td><td style="font-weight: bold; text-align: right;">${planName}</td></tr>
                        <tr><td style="color: #6f6a73;">Next billing date</td><td style="font-weight: bold; text-align: right;">${nextBillingDateStr}</td></tr>
                      </table>
                    </div>
                    <p style="color: #6f6a73; font-size: 12px; margin-top: 25px; border-top: 1px solid #e7e1e4; padding-top: 15px;">Thank you for using InteraOne.</p>
                  </div>`
                );
              } else if (parsed.action === "cancel") {
                await enqueueRawEmail(
                  ownerUser.email,
                  "Your InteraOne subscription has been cancelled",
                  `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e7e1e4; border-radius: 16px; background-color: #ffffff;">
                    <h2 style="color: #da8620; margin-bottom: 20px;">Subscription Cancelled</h2>
                    <p>Hello ${ownerUser.name},</p>
                    <p>Your subscription to the <strong>${planName}</strong> plan has been cancelled as requested. You will continue to have access to all features and quotas until your current billing period ends on <strong>${nextBillingDateStr}</strong>.</p>
                    <p>After this date, your workspace will be downgraded to the Free starter plan.</p>
                    <p style="color: #6f6a73; font-size: 12px; margin-top: 25px; border-top: 1px solid #e7e1e4; padding-top: 15px;">Thank you for using InteraOne.</p>
                  </div>`
                );
              } else if (parsed.action === "expire") {
                await enqueueRawEmail(
                  ownerUser.email,
                  "Your InteraOne subscription has expired",
                  `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e7e1e4; border-radius: 16px; background-color: #ffffff;">
                    <h2 style="color: #b94745; margin-bottom: 20px;">Subscription Expired</h2>
                    <p>Hello ${ownerUser.name},</p>
                    <p>Your subscription has expired and your workspace has been downgraded to the <strong>Free</strong> plan.</p>
                    <p>Your monthly AI message limit is now 50. If you have already used more than 50 messages, automated AI assistance will be paused until your usage cycle resets or you upgrade.</p>
                    <p style="color: #6f6a73; font-size: 12px; margin-top: 25px; border-top: 1px solid #e7e1e4; padding-top: 15px;">Thank you for using InteraOne.</p>
                  </div>`
                );
              }
            }
          }
        } catch (err: any) {
          logger.error(`[Billing Webhook] Failed to send subscription email for org=${parsed.organizationId}: ${err.message}`);
        }
      }

      await BillingWebhookEvent.updateOne(
        { provider: parsed.provider, eventId },
        { $set: { status: "processed", processedAt: new Date() } },
      );

      sendResponse(res, 200, true, "Webhook processed", { eventId, ...result });
    } catch (error: any) {
      const parsedEventId = req.body?.id || req.body?.event_id || req.body?.data?.id;

      if (parsedEventId) {
        await BillingWebhookEvent.updateOne(
          { provider: "dodo", eventId: String(parsedEventId) },
          { $set: { status: "failed", errorMessage: error?.message || "Webhook processing failed", processedAt: new Date() } },
        );
      }

      logger.error("[Billing Webhook] Processing failed", { error: error?.message, stack: error?.stack });
      sendError(res, 500, "Webhook processing failed");
    }
  }

  static async getBillingPortal(req: Request, res: Response): Promise<void> {
    try {
      const activeOrganizationId = resolveAndValidateScopedOrgId(req, res);
      if (!activeOrganizationId) {
        return;
      }
      const { userId } = (req as AuthenticatedRequest).user;
      const requestedPlan = (req.query.targetPlan || "pro").toString().toLowerCase();
      const targetPlan = requestedPlan === "proplus" ? "proplus" : "pro";
      const ee = loadEeModule();

      if (!ee?.billing?.createPortalSession) {
        sendError(res, 503, "EE billing module unavailable");
        return;
      }

      const data = await ee.billing.createPortalSession({
        organizationId: activeOrganizationId,
        userId,
        targetPlan,
      });

      const raw = (data as { raw?: Record<string, unknown> })?.raw;
      const checkoutSessionId =
        (raw?.checkout_session_id as string | undefined) ||
        (raw?.checkoutSessionId as string | undefined) ||
        (raw?.session_id as string | undefined) ||
        (raw?.id as string | undefined);

      if (checkoutSessionId) {
        await BillingCheckoutIntent.updateOne(
          { checkoutSessionId, status: { $ne: "consumed" } },
          {
            $set: {
              organizationId: activeOrganizationId,
              userId,
              targetPlan,
              status: "pending",
            },
            $unset: {
              consumedAt: "",
            },
          },
          { upsert: true },
        );
      }

      sendResponse(res, 200, true, "Billing portal ready", data);
    } catch (error: any) {
      sendError(res, 400, error.message);
    }
  }

  static async getBillingEntitlements(req: Request, res: Response): Promise<void> {
    try {
      const activeOrganizationId = resolveAndValidateScopedOrgId(req, res);
      if (!activeOrganizationId) {
        return;
      }

      const expectedSubId = req.query.subscription_id as string;
      if (expectedSubId) {
        // Check if it's already active in DB
        const exists = await BillingSubscription.findOne({
          organizationId: activeOrganizationId,
          providerId: expectedSubId,
          status: "active",
        }).lean();

        if (!exists) {
          try {
            const ee = loadEeModule();
            if (ee?.billing?.createClient && ee?.billing?.handleSubscriptionEvent) {
              const client = ee.billing.createClient();
              const dodoSub = await client.subscriptions.retrieve(expectedSubId);
              
              if (dodoSub && (dodoSub.status === "active" || dodoSub.status === "pending")) {
                const metadata = dodoSub.metadata || {};
                const orgIdInMetadata = metadata.organization_id || metadata.organizationId;
                
                if (orgIdInMetadata === activeOrganizationId) {
                  // Synchronously trigger activation!
                  await ee.billing.handleSubscriptionEvent({
                    action: "activate",
                    organizationId: activeOrganizationId,
                    subscriptionId: expectedSubId,
                    targetPlan: metadata.targetPlan || metadata.target_plan || "pro",
                    currentPeriodEnd: dodoSub.next_billing_date ? new Date(dodoSub.next_billing_date) : undefined,
                    core: {
                      OrganizationModel: Organization,
                      BillingSubscriptionModel: BillingSubscription,
                    },
                  });
                  invalidateOrganizationPlanCache(activeOrganizationId);
                  logger.info(`[BillingPortal] Successfully synced subscription ${expectedSubId} directly from Dodo Payments API`);
                }
              }
            }
          } catch (err: any) {
            logger.warn(`[BillingPortal] Failed to directly fetch/activate subscription ${expectedSubId} from Dodo API: ${err.message}`);
          }
        }
      }

      const org = await Organization.findById(activeOrganizationId).select("plan").lean<{ plan?: string }>();
      const currentPlan = normalizePlan(org?.plan);

      const sub = await BillingSubscription.findOne({ organizationId: activeOrganizationId })
        .select("providerId status")
        .lean<{ providerId?: string; status?: string }>();

      const data = {
        currentPlan,
        subscriptionId: sub?.providerId || null,
        subscriptionStatus: sub?.status || null,
        plans: getPlanCatalog(),
        entitlements: resolvePlanEntitlements(currentPlan),
      };

      sendResponse(res, 200, true, "Billing entitlements retrieved", data);
    } catch (error: any) {
      sendError(res, 400, error.message || "Failed to fetch billing entitlements");
    }
  }

  static async getBillingUsage(req: Request, res: Response): Promise<void> {
    try {
      const activeOrganizationId = resolveAndValidateScopedOrgId(req, res);
      if (!activeOrganizationId) return;
      const snapshot = await getOrganizationUsage(activeOrganizationId);

      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");

      sendResponse(res, 200, true, "Usage retrieved", snapshot);
    } catch (error: any) {
      sendError(res, 400, error.message || "Failed to fetch usage");
    }
  }
}