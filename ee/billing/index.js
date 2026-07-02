/*
 * Copyright (c) 2026 Om Pharate
 *
 * This file is part of InteraOne Enterprise Edition (EE).
 *
 * Licensed under the InteraOne Enterprise License.
 * See LICENSE for details.
 */

// @ts-check
"use strict";

const { createDodoCheckoutSession } = require("./checkout");
const { verifyWebhookSignature } = require("./webhook/verify");
const { parseSubscriptionEvent } = require("./webhook/parse");

/**
 * @typedef {import("./checkout").CheckoutResult} CheckoutResult
 * @typedef {import("./webhook/parse").ParsedSubscriptionEvent} ParsedSubscriptionEvent
 * @typedef {import("./webhook/verify").SignatureVerificationResult} SignatureVerificationResult
 * @typedef {Record<string, string | string[] | undefined>} HttpHeaders
 *
 * @typedef {object} MongooseModel
 * @property {(id: string, update: object, opts?: object) => Promise<unknown>} findByIdAndUpdate
 * @property {(filter: object, update: object, opts?: object) => Promise<unknown>} findOneAndUpdate
 *
 * @typedef {object} SubscriptionMongooseModel
 * @property {(filter: object, update: object, opts?: object) => Promise<unknown>} findOneAndUpdate
 * @property {(filter: object) => { lean: () => Promise<unknown> }} findOne
 *
 * @typedef {object} CoreDeps
 * @property {MongooseModel} OrganizationModel
 * @property {SubscriptionMongooseModel} BillingSubscriptionModel
 *
 * @typedef {object} HandleSubscriptionEventParams
 * @property {import("./webhook/parse").SubscriptionAction} action
 * @property {string} [organizationId]
 * @property {string} [subscriptionId]
 * @property {import("./webhook/parse").PlanTier} [targetPlan]
 * @property {Date} [currentPeriodEnd]
 * @property {CoreDeps} core
 */

/**
 * Dispatches a subscription lifecycle action to update both the Organization
 * document and the BillingSubscription record.
 *
 * Action semantics:
 *   activate   → set plan + subscriptionStatus=active, upsert BillingSubscription
 *   renew      → extend currentPeriodEnd, reset status to active
 *   past_due   → mark subscriptionStatus=past_due (2-day grace period before worker downgrades)
 *   cancel     → set cancelAtPeriodEnd=true (access continues until period end)
 *   expire     → downgrade to free, set subscriptionStatus=cancelled
 *
 * @param {HandleSubscriptionEventParams} params
 * @returns {Promise<{ action: string, plan?: string }>}
 */
async function handleSubscriptionEvent({ action, organizationId, subscriptionId, targetPlan, currentPeriodEnd, core }) {
  if (!organizationId) {
    return { action: "skipped", plan: undefined };
  }

  const { OrganizationModel, BillingSubscriptionModel } = core;
  const now = new Date();

  switch (action) {
    case "activate": {
      const plan = targetPlan || "pro";
      // Update the organisation plan and subscription status
      await OrganizationModel.findByIdAndUpdate(organizationId, {
        $set: {
          plan,
          subscriptionStatus: "active",
          cancelAtPeriodEnd: false,
        },
      });
      // Upsert the subscription record with the provider ID and billing period
      await BillingSubscriptionModel.findOneAndUpdate(
        { organizationId },
        {
          $set: {
            organizationId,
            provider: "dodo",
            providerId: subscriptionId || "",
            plan,
            status: "active",
            currentPeriodStart: now,
            currentPeriodEnd: currentPeriodEnd || new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
            cancelAtPeriodEnd: false,
          },
        },
        { upsert: true },
      );
      return { action: "activate", plan };
    }

    case "renew": {
      // Extend the billing period, reset past_due → active if needed
      await OrganizationModel.findByIdAndUpdate(organizationId, {
        $set: { subscriptionStatus: "active", cancelAtPeriodEnd: false },
      });
      await BillingSubscriptionModel.findOneAndUpdate(
        { organizationId },
        {
          $set: {
            status: "active",
            currentPeriodStart: now,
            currentPeriodEnd: currentPeriodEnd || new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
            cancelAtPeriodEnd: false,
          },
        },
        { upsert: false },
      );
      return { action: "renew" };
    }

    case "past_due": {
      // Mark as past_due — the subscription expiry worker will downgrade after 2 days
      await OrganizationModel.findByIdAndUpdate(organizationId, {
        $set: { subscriptionStatus: "past_due" },
      });
      await BillingSubscriptionModel.findOneAndUpdate(
        { organizationId },
        { $set: { status: "past_due" } },
        { upsert: false },
      );
      return { action: "past_due" };
    }

    case "cancel": {
      // User cancelled — access continues until currentPeriodEnd (handled by expiry worker)
      await OrganizationModel.findByIdAndUpdate(organizationId, {
        $set: { cancelAtPeriodEnd: true },
      });
      await BillingSubscriptionModel.findOneAndUpdate(
        { organizationId },
        { $set: { cancelAtPeriodEnd: true, status: "cancelled" } },
        { upsert: false },
      );
      return { action: "cancel" };
    }

    case "expire": {
      // Grace period over / subscription fully expired — downgrade immediately
      await OrganizationModel.findByIdAndUpdate(organizationId, {
        $set: {
          plan: "free",
          subscriptionStatus: "cancelled",
          cancelAtPeriodEnd: false,
        },
      });
      await BillingSubscriptionModel.findOneAndUpdate(
        { organizationId },
        { $set: { plan: "free", status: "cancelled" } },
        { upsert: false },
      );
      return { action: "expire", plan: "free" };
    }

    default:
      return { action: "unknown" };
  }
}

module.exports = {
  /**
   * Creates a Dodo Payments hosted checkout session and returns the redirect URL.
   * @param {{ organizationId: string, userId: string, targetPlan?: "pro" | "proplus" }} params
   * @returns {Promise<CheckoutResult>}
   */
  async createPortalSession({ organizationId, userId, targetPlan }) {
    return createDodoCheckoutSession({ organizationId, userId, targetPlan: targetPlan ?? "pro" });
  },

  /**
   * Cryptographically verifies the HMAC signature of an incoming Dodo Payments webhook.
   * @param {{ headers: HttpHeaders, rawBody: string }} params
   * @returns {SignatureVerificationResult}
   */
  verifyWebhookSignature,

  /**
   * Parses a subscription lifecycle webhook event into a standardised action shape.
   * @param {{ body: unknown, headers?: HttpHeaders }} params
   * @returns {ParsedSubscriptionEvent}
   */
  parseSubscriptionEvent,



  /**
   * Handles a subscription lifecycle action by updating Organisation + BillingSubscription.
   * @param {HandleSubscriptionEventParams} params
   */
  handleSubscriptionEvent,
};
