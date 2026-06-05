// @ts-check
"use strict";

/**
 * Resolves the Dodo Payments product ID for a given plan tier.
 * Reads product IDs from environment variables set in `ee/.env.example`.
 *
 * @param {"pro" | "proplus"} targetPlan
 * @returns {string | undefined}
 */
function resolveProductId(targetPlan) {
  if (targetPlan === "proplus") {
    return process.env.DODO_PAYMENTS_PRODUCT_PROPLUS;
  }
  if (targetPlan === "pro") {
    return process.env.DODO_PAYMENTS_PRODUCT_PRO;
  }
  return undefined;
}

module.exports = { resolveProductId };
