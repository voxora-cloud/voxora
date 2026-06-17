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

const crypto = require("crypto");
const { resolveWebhookHeaders } = require("./headers");

/**
 * @typedef {Record<string, string | string[] | undefined>} HttpHeaders
 *
 * @typedef {object} SignatureVerificationResult
 * @property {boolean} isValid
 * @property {string} [reason] - Human-readable failure reason, present when isValid is false.
 *
 * @typedef {object} ParsedSignature
 * @property {string | undefined} timestamp
 * @property {string[]} signatures
 */

/** @returns {string | undefined} */
function getWebhookSecret() {
  return process.env.DODO_PAYMENTS_WEBHOOK_SECRET || process.env.DODO_PAYMENTS_WEBHOOK_KEY;
}

/**
 * Constant-time string comparison to prevent timing-based attacks.
 * Both strings are converted to UTF-8 Buffers before comparing.
 *
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
function timingSafeEqual(a, b) {
  const aBuffer = Buffer.from(a || "", "utf8");
  const bBuffer = Buffer.from(b || "", "utf8");
  if (aBuffer.length !== bBuffer.length) return false;
  return crypto.timingSafeEqual(aBuffer, bBuffer);
}

/**
 * Parses a compound webhook-signature header into its constituent timestamp
 * and signature values. Supports multiple formats:
 *   - Svix:   "v1,BASE64 v0,OTHER"
 *   - Stripe: "t=1712473200,v1=HEX"
 *   - Dodo:   "v1=HEX" or 'v1="HEX"'
 *
 * @param {string | undefined} rawHeader
 * @returns {ParsedSignature}
 */
function parseCompoundSignature(rawHeader) {
  if (!rawHeader || typeof rawHeader !== "string") {
    return { timestamp: undefined, signatures: [] };
  }
  const clean = rawHeader.trim();
  if (!clean) return { timestamp: undefined, signatures: [] };

  /** @type {string[]} */
  const signatures = [];
  /** @type {string | undefined} */
  let timestamp;

  // Extract optional timestamp token: t=1712473200
  const timestampMatch = clean.match(/(?:^|[\s,;])t\s*=\s*"?([0-9]+)"?/i);
  if (timestampMatch?.[1]) timestamp = timestampMatch[1].trim();

  // Extract v1 signatures: v1=<sig>, v1:<sig>
  const v1Regex = /(?:^|[\s,;])v1\s*[=:,]\s*"?([^"\s,;]+)"?/gi;
  let v1Match;
  while ((v1Match = v1Regex.exec(clean)) !== null) {
    if (v1Match[1]) signatures.push(v1Match[1].trim());
  }
  if (signatures.length > 0) return { timestamp, signatures };

  // Stripe-style comma-separated pairs: "t=TS,v1=SIG"
  if (clean.includes("=") && clean.includes(",")) {
    /** @type {Record<string, string>} */
    const parsed = Object.fromEntries(
      clean.split(",").map((p) => /** @type {[string, string]} */ (p.trim().split("="))),
    );
    const parsedSigs = [parsed["v1"], parsed["signature"]]
      .filter(Boolean)
      .map((v) => v.replace(/^"|"$/g, "").trim())
      .filter(Boolean);
    if (parsedSigs.length > 0) return { timestamp: parsed["t"] || timestamp, signatures: parsedSigs };
  }

  // Svix space-separated "v1,BASE64" tokens
  const commaStyle = clean
    .split(" ")
    .filter((p) => p.startsWith("v1,"))
    .map((p) => p.slice(3));
  if (commaStyle.length > 0) return { timestamp, signatures: commaStyle };

  // Bare "v1=SIG" or "v1:SIG"
  const singleV1 = clean.match(/^v1\s*[=:]\s*"?([^"\s,;]+)"?$/i);
  if (singleV1?.[1]) return { timestamp, signatures: [singleV1[1].trim()] };

  return { timestamp, signatures: [clean] };
}

/**
 * Decodes the webhook secret, stripping the optional "whsec_" prefix used by
 * some Svix-based providers.
 *
 * @param {string | undefined} secret
 * @returns {Buffer | undefined}
 */
function parseWebhookSecret(secret) {
  if (!secret) return undefined;
  const normalized = secret.startsWith("whsec_") ? secret.slice(6) : secret;
  try {
    const decoded = Buffer.from(normalized, "base64");
    if (decoded.length > 0) return decoded;
  } catch (_) {
    // fallthrough to utf8
  }
  return Buffer.from(secret, "utf8");
}

/**
 * Verifies a webhook using the Svix signing scheme:
 *   HMAC-SHA256( webhookId + "." + timestamp + "." + rawBody )
 *
 * @param {{ secret: string, rawBody: string, webhookId: string | undefined, timestamp: string | undefined, signatures: string[] }} params
 * @returns {boolean}
 */
function verifyUsingSvixScheme({ secret, rawBody, webhookId, timestamp, signatures }) {
  if (!webhookId || !timestamp || !signatures.length) return false;
  const key = parseWebhookSecret(secret);
  if (!key) return false;
  const signedPayload = `${webhookId}.${timestamp}.${rawBody || ""}`;
  const expected = crypto.createHmac("sha256", key).update(signedPayload).digest("base64");
  return signatures.some((candidate) => timingSafeEqual(expected, candidate));
}

/**
 * Verifies a webhook using the legacy HMAC scheme:
 *   HMAC-SHA256( timestamp + "." + rawBody ) — hex or base64 encoded.
 *
 * @param {{ secret: string, rawBody: string, timestamp: string | undefined, signatures: string[] }} params
 * @returns {boolean}
 */
function verifyUsingLegacyScheme({ secret, rawBody, timestamp, signatures }) {
  if (!signatures.length) return false;
  const payload = timestamp ? `${timestamp}.${rawBody || ""}` : rawBody || "";
  const expectedHex = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  const expectedBase64 = crypto.createHmac("sha256", secret).update(payload).digest("base64");
  return signatures.some(
    (c) => timingSafeEqual(expectedHex, c) || timingSafeEqual(expectedBase64, c),
  );
}

/**
 * Verifies the cryptographic HMAC signature of an incoming webhook request.
 * Tries the Svix scheme first, then falls back to the legacy scheme.
 *
 * @param {{ headers: HttpHeaders, rawBody: string }} params
 * @returns {SignatureVerificationResult}
 */
function verifyWebhookSignature({ headers, rawBody }) {
  const secret = getWebhookSecret();
  if (!secret) {
    return {
      isValid: false,
      reason: "Missing DODO_PAYMENTS_WEBHOOK_SECRET or DODO_PAYMENTS_WEBHOOK_KEY",
    };
  }

  const webhookHeaders = resolveWebhookHeaders(headers);
  if (!webhookHeaders.signature) {
    return { isValid: false, reason: "Missing webhook signature header" };
  }

  const { timestamp, signatures } = parseCompoundSignature(webhookHeaders.signature);
  if (!signatures.length) {
    return { isValid: false, reason: "Invalid webhook signature format" };
  }

  if (verifyUsingSvixScheme({
    secret,
    rawBody,
    webhookId: webhookHeaders.webhookId,
    timestamp: webhookHeaders.timestamp || timestamp,
    signatures,
  })) {
    return { isValid: true };
  }

  const legacyValid = verifyUsingLegacyScheme({
    secret,
    rawBody,
    timestamp: webhookHeaders.timestamp || timestamp,
    signatures,
  });

  return {
    isValid: legacyValid,
    reason: legacyValid ? undefined : "Webhook signature verification failed",
  };
}

module.exports = { verifyWebhookSignature };
