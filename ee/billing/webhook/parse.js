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

const { getHeader } = require("./headers");

/**
 * @typedef {Record<string, string | string[] | undefined>} HttpHeaders
 *
 * @typedef {"pro" | "proplus"} PlanTier
 *
 * @typedef {"activate" | "renew" | "past_due" | "cancel" | "expire" | "unknown"} SubscriptionAction
 *
 * @typedef {object} ParsedSubscriptionEvent
 * @property {string}              provider           - Always "dodo".
 * @property {string}              eventId            - Unique event ID for idempotency.
 * @property {string}              eventType          - Raw event type string.
 * @property {SubscriptionAction}  action             - Normalised action to dispatch.
 * @property {string}              [subscriptionId]   - Dodo subscription object ID.
 * @property {string}              [organizationId]   - Org that owns this subscription.
 * @property {PlanTier}            [targetPlan]       - Plan to activate (only on "activate").
 * @property {Date}                [currentPeriodEnd] - When the current billing period ends.
 */

const DODO_PROVIDER = "dodo";

/** @param {unknown} payload @param {string} path @returns {unknown} */
function getObject(payload, path) {
  return path.split(".").reduce((/** @type {any} */ acc, key) => {
    if (!acc || typeof acc !== "object") return undefined;
    return acc[key];
  }, payload);
}

/**
 * Maps a raw Dodo event type string to a normalised SubscriptionAction.
 * Handles variations across Dodo API versions.
 *
 * @param {string} eventType
 * @returns {SubscriptionAction}
 */
function resolveSubscriptionAction(eventType) {
  const t = (eventType || "").toLowerCase();

  if (t.includes("subscription.active") || t.includes("subscription.activated")) return "activate";
  if (t.includes("subscription.renewed") || t.includes("subscription.renewal_succeeded")) return "renew";
  if (t.includes("subscription.past_due") || t.includes("subscription.payment_failed") || t.includes("subscription.charge_failed")) return "past_due";
  if (t.includes("subscription.cancelled") || t.includes("subscription.canceled")) return "cancel";
  if (t.includes("subscription.expired")) return "expire";

  return "unknown";
}

/**
 * Infers the target plan tier from the webhook payload.
 * Priority: metadata.targetPlan → product_id match against env vars.
 *
 * @param {unknown} payload
 * @returns {PlanTier | undefined}
 */
function inferPlanFromPayload(payload) {
  const metadataPlan =
    getObject(payload, "data.metadata.targetPlan") ||
    getObject(payload, "data.metadata.target_plan") ||
    getObject(payload, "data.payload.metadata.targetPlan") ||
    getObject(payload, "metadata.targetPlan") ||
    getObject(payload, "metadata.target_plan");

  const normalized = typeof metadataPlan === "string" ? metadataPlan.toLowerCase() : undefined;
  if (normalized === "pro" || normalized === "proplus") {
    return /** @type {PlanTier} */ (normalized);
  }

  const productId =
    String(getObject(payload, "data.product_id") || getObject(payload, "data.items.0.price.product_id") || "");

  const proplusId = process.env.DODO_PAYMENTS_PRODUCT_PROPLUS;
  if (proplusId && productId === proplusId) return "proplus";
  if (process.env.DODO_PAYMENTS_PRODUCT_PRO && productId === process.env.DODO_PAYMENTS_PRODUCT_PRO) return "pro";

  return undefined;
}

/**
 * Extracts the subscription period end date from the Dodo payload.
 * Returns undefined if no period information is available.
 *
 * @param {unknown} payload
 * @returns {Date | undefined}
 */
function extractPeriodEnd(payload) {
  const raw =
    getObject(payload, "data.next_billing_date") ||
    getObject(payload, "data.subscription.next_billing_date") ||
    getObject(payload, "data.current_period_end") ||
    getObject(payload, "data.current_billing_period_end") ||
    getObject(payload, "data.subscription.current_period_end") ||
    getObject(payload, "next_billing_date");

  if (!raw) return undefined;
  const d = new Date(/** @type {any} */ (raw));
  return isNaN(d.getTime()) ? undefined : d;
}

/**
 * Parses a raw Dodo Payments subscription webhook into a standardised shape.
 * This replaces the old `parseWebhookEvent` for subscription-based billing.
 *
 * @param {{ body: unknown, headers?: HttpHeaders }} params
 * @returns {ParsedSubscriptionEvent}
 */
function parseSubscriptionEvent({ body, headers }) {
  const eventType = String(
    getObject(body, "type") ||
    getObject(body, "event") ||
    getObject(body, "event_type") ||
    "unknown",
  );

  const rawEventId =
    getObject(body, "id") ||
    getObject(body, "event_id") ||
    getObject(body, "data.id") ||
    (headers && getHeader(headers, "webhook-id")) ||
    (headers && getHeader(headers, "svix-id"));

  const rawSubscriptionId =
    getObject(body, "data.subscription_id") ||
    getObject(body, "data.id") ||
    getObject(body, "data.payload.subscription_id");

  const rawOrgId =
    getObject(body, "data.metadata.organizationId") ||
    getObject(body, "data.metadata.organization_id") ||
    getObject(body, "data.payload.metadata.organizationId") ||
    getObject(body, "metadata.organizationId") ||
    getObject(body, "metadata.organization_id");

  const action = resolveSubscriptionAction(eventType);
  const targetPlan = action === "activate" ? inferPlanFromPayload(body) : undefined;
  const currentPeriodEnd = extractPeriodEnd(body);

  return {
    provider: DODO_PROVIDER,
    eventId: String(rawEventId || ""),
    eventType,
    action,
    subscriptionId: rawSubscriptionId ? String(rawSubscriptionId) : undefined,
    organizationId: rawOrgId ? String(rawOrgId) : undefined,
    targetPlan,
    currentPeriodEnd,
  };
}

module.exports = { parseSubscriptionEvent };
