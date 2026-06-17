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

const { createClient } = require("./client");
const { resolveProductId } = require("./products");

/**
 * @typedef {object} CheckoutResult
 * @property {string} url        - The hosted checkout URL to redirect the user to.
 * @property {string} provider   - The payment provider that generated this URL ("dodo" | "fallback").
 * @property {object} [raw]      - The raw response from the Dodo Payments API.
 */

/**
 * Creates a Dodo Payments hosted checkout session.
 * Passes `organizationId` and `userId` in the session metadata so the webhook
 * handler can identify which organisation upgraded after a successful payment.
 *
 * @param {{ organizationId: string, userId: string, targetPlan: "pro" | "proplus" }} params
 * @returns {Promise<CheckoutResult>}
 */
async function createDodoCheckoutSession({ organizationId, userId, targetPlan }) {
  const apiKey = process.env.DODO_PAYMENTS_API_KEY;

  // Graceful fallback: if no API key is configured, redirect to the billing page
  // rather than crashing. Useful in local development environments.
  if (!apiKey) {
    return { url: "/dashboard/settings/billing", provider: "fallback" };
  }

  const successUrl =
    process.env.DODO_PAYMENTS_SUCCESS_URL ||
    `${process.env.CLIENT_URL || "http://localhost:5173"}/dashboard/settings/billing/success`;

  const cancelUrl =
    process.env.DODO_PAYMENTS_CANCEL_URL ||
    `${process.env.CLIENT_URL || "http://localhost:5173"}/dashboard/settings/billing/failed`;

  const plan = targetPlan === "proplus" ? "proplus" : "pro";
  const productId = resolveProductId(plan);

  if (!productId) {
    throw new Error(`Missing Dodo product ID for plan: ${plan}. Check DODO_PAYMENTS_PRODUCT_PRO / DODO_PAYMENTS_PRODUCT_PROPLUS in your .env`);
  }

  const client = createClient();
  const session = await client.checkoutSessions.create({
    product_cart: [{ product_id: productId, quantity: 1 }],
    return_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      // Store both camelCase and snake_case for maximum webhook compatibility.
      organizationId,
      organization_id: organizationId,
      userId,
      user_id: userId,
      targetPlan: plan,
      target_plan: plan,
    },
  });

  const checkoutUrl =
    /** @type {any} */ (session)?.checkout_url ||
    /** @type {any} */ (session)?.url ||
    /** @type {any} */ (session)?.payment_link ||
    null;

  if (!checkoutUrl) {
    throw new Error("Dodo checkout response did not include a checkout URL");
  }

  return { url: String(checkoutUrl), provider: "dodo", raw: /** @type {object} */ (session) };
}

module.exports = { createDodoCheckoutSession };
