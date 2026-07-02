import mongoose from "mongoose";
import { Schema, Document } from "mongoose";
import { Worker, Queue, ConnectionOptions } from "bullmq";
import config from "../config";
import logger from "../utils/logger";

export const SUBSCRIPTION_EXPIRY_QUEUE = "subscription-expiry";

// ── Grace period constants ───────────────────────────────────────────────────
/** Downgrade after 2 days of being in past_due state */
const PAST_DUE_GRACE_PERIOD_MS = 2 * 24 * 60 * 60 * 1000;

// ── Minimal inline schemas ────────────────────────────────────────────────────
// The worker is a separate process from the API and does not share its module
// graph. We define minimal schemas here — enough for the queries we need —
// rather than importing the full @InteraOne/gateway models package.

interface IBillingSubscriptionLean {
  organizationId: string;
  status: string;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: Date;
  updatedAt: Date;
}


function getModels() {
  const BillingSubscription =
    mongoose.models["BillingSubscription"] ||
    mongoose.model(
      "BillingSubscription",
      new Schema(
        {
          organizationId: String,
          provider: String,
          providerId: String,
          plan: String,
          status: String,
          currentPeriodStart: Date,
          currentPeriodEnd: Date,
          cancelAtPeriodEnd: { type: Boolean, default: false },
          lastEventId: String,
        },
        { timestamps: true },
      ),
    );

  const Organization =
    mongoose.models["Organization"] ||
    mongoose.model(
      "Organization",
      new Schema(
        {
          plan: String,
          subscriptionStatus: String,
          cancelAtPeriodEnd: Boolean,
        },
        { timestamps: true, strict: false },
      ),
    );

  return { BillingSubscription, Organization };
}

// ── DB connection ─────────────────────────────────────────────────────────────

async function connectDb(): Promise<void> {
  if (mongoose.connection.readyState === 1) return;
  await mongoose.connect(config.database.mongoUri);
}

// ── Worker processor ─────────────────────────────────────────────────────────

async function processSubscriptionExpiry(): Promise<void> {
  await connectDb();
  const { BillingSubscription, Organization } = getModels();

  const now = new Date();
  const pastDueCutoff = new Date(now.getTime() - PAST_DUE_GRACE_PERIOD_MS);

  // ── Case 1: past_due for more than 2 days → downgrade to free ───────────
  const pastDueExpired = await BillingSubscription.find({
    status: "past_due",
    updatedAt: { $lt: pastDueCutoff },
  })
    .select("organizationId")
    .lean() as IBillingSubscriptionLean[];

  for (const sub of pastDueExpired) {
    try {
      await BillingSubscription.updateOne(
        { organizationId: sub.organizationId },
        { $set: { status: "cancelled", plan: "free" } },
      );
      await Organization.findByIdAndUpdate(sub.organizationId, {
        $set: { plan: "free", subscriptionStatus: "cancelled", cancelAtPeriodEnd: false },
      });
      logger.warn("Subscription downgraded after past_due grace period", {
        organizationId: sub.organizationId,
        reason: "past_due_grace_period_exceeded",
      });
    } catch (err: any) {
      logger.error("Failed to downgrade past_due subscription", {
        organizationId: sub.organizationId,
        error: err,
      });
    }
  }

  // ── Case 2: cancelAtPeriodEnd subscriptions past their period end ────────
  // Safety net for missed subscription.expired webhooks from Dodo.
  const periodExpired = await BillingSubscription.find({
    status: { $in: ["active", "cancelled"] },
    cancelAtPeriodEnd: true,
    currentPeriodEnd: { $lt: now },
  })
    .select("organizationId")
    .lean() as IBillingSubscriptionLean[];

  for (const sub of periodExpired) {
    try {
      await BillingSubscription.updateOne(
        { organizationId: sub.organizationId },
        { $set: { status: "cancelled", plan: "free" } },
      );
      await Organization.findByIdAndUpdate(sub.organizationId, {
        $set: { plan: "free", subscriptionStatus: "cancelled", cancelAtPeriodEnd: false },
      });
      logger.warn("Subscription downgraded after period ended", {
        organizationId: sub.organizationId,
        reason: "cancel_at_period_end_elapsed",
      });
    } catch (err: any) {
      logger.error("Failed to downgrade period-ended subscription", {
        organizationId: sub.organizationId,
        error: err,
      });
    }
  }

  logger.info("Subscription expiry scan completed", {
    pastDueExpired: pastDueExpired.length,
    periodExpired: periodExpired.length,
  });
}

// ── Queue + Worker setup ──────────────────────────────────────────────────────

export function startSubscriptionExpiryWorker() {
  const connection: ConnectionOptions = {
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password,
    maxRetriesPerRequest: null,
  };

  // Register the repeatable job — runs every hour
  const queue = new Queue(SUBSCRIPTION_EXPIRY_QUEUE, { connection });
  queue.upsertJobScheduler(
    "subscription-expiry-hourly",
    { every: 60 * 60 * 1000 },
    { name: "subscription-expiry", data: {} },
  );

  const worker = new Worker(
    SUBSCRIPTION_EXPIRY_QUEUE,
    async () => { await processSubscriptionExpiry(); },
    { connection, concurrency: 1 },
  );

  worker.on("completed", () =>
    logger.info("Subscription expiry job completed", {
      queue: SUBSCRIPTION_EXPIRY_QUEUE,
    }),
  );
  worker.on("failed", (_job, err) =>
    logger.error("Subscription expiry job failed", {
      queue: SUBSCRIPTION_EXPIRY_QUEUE,
      error: err,
    }),
  );
  worker.on("error", (err) =>
    logger.error("Subscription expiry worker error", {
      queue: SUBSCRIPTION_EXPIRY_QUEUE,
      error: err,
    }),
  );

  logger.info("Subscription expiry worker started", {
    queue: SUBSCRIPTION_EXPIRY_QUEUE,
    intervalMs: 60 * 60 * 1000,
  });

  return worker;
}
