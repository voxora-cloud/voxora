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

/**
 * @typedef {object} DodoClient
 * @property {{ create: (params: object) => Promise<object> }} checkoutSessions
 * @property {{ retrieve: (id: string) => Promise<any>, changePlan: (id: string, params: object) => Promise<any> }} subscriptions
 * @property {{ customerPortal: { create: (customerId: string) => Promise<any> } }} customers
 */

/**
 * Creates and returns a configured Dodo Payments SDK client.
 * Reads `DODO_PAYMENTS_API_KEY` and `DODO_PAYMENTS_ENVIRONMENT` from the environment.
 *
 * The `dodopayments` package ships as an ES module with a default export, so we
 * resolve it defensively to handle both CJS and ESM interop scenarios.
 *
 * @returns {DodoClient}
 */
function createClient() {
  // Explicitly typed as `any` to suppress ts-check errors on dynamic require() interop.
  // The dodopayments SDK is not guaranteed to ship @types, so we trust the DodoClient
  // typedef we defined above and cast the result.
  const mod = /** @type {any} */ (require("dodopayments"));
  const DodoPayments = /** @type {new (opts: object) => DodoClient} */ (mod.default || mod);

  const isProduction = process.env.NODE_ENV === "production";
  const defaultEnv = isProduction ? "live_mode" : "test_mode";

  return new DodoPayments({
    bearerToken: process.env.DODO_PAYMENTS_API_KEY,
    environment: process.env.DODO_PAYMENTS_ENVIRONMENT || defaultEnv,
  });
}

module.exports = { createClient };
