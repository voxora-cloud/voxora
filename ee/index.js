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

const billing = require("./billing");
const contacts = require("./contacts");
const whitelabel = require("./whitelabel");

/**
 * @typedef {import("./billing/checkout").CheckoutResult} CheckoutResult
 * @typedef {import("./billing/webhook/parse").ParsedSubscriptionEvent} ParsedSubscriptionEvent
 * @typedef {import("./billing/webhook/verify").SignatureVerificationResult} SignatureVerificationResult
 */

/**
 * The EE module contract. This object shape is validated by the core API at
 * startup via `validateEeModuleContract()` in `apps/gateway/src/shared/ee/loader.ts`.
 *
 * contractVersion must be "1" to satisfy the current contract.
 *
 * @type {{
 *   contractVersion: "1",
 *   billing: typeof billing,
 *   contacts: typeof contacts,
 *   whiteLabel: typeof whitelabel,
 * }}
 */
module.exports = {
  contractVersion: "1",
  billing,
  contacts,
  whiteLabel: whitelabel,
};
