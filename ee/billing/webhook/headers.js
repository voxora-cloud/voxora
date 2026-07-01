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
 * @typedef {Record<string, string | string[] | undefined>} HttpHeaders
 */

/**
 * Case-insensitive HTTP header extraction that handles Express's multi-value arrays.
 * Returns the first value if the header is an array (e.g. from `req.headers`).
 *
 * @param {HttpHeaders} headers
 * @param {string} name
 * @returns {string | undefined}
 */
function getHeader(headers, name) {
  if (!headers || typeof headers !== "object") return undefined;

  const direct = headers[name];
  if (typeof direct === "string") return direct;

  const key = Object.keys(headers).find((k) => k.toLowerCase() === name.toLowerCase());
  if (!key) return undefined;

  const value = headers[key];
  if (Array.isArray(value)) return value[0];
  return typeof value === "string" ? value : undefined;
}

/**
 * Normalises the raw HTTP headers from an incoming webhook request into a
 * consistent shape, supporting multiple provider header naming conventions
 * (Dodo, Svix, legacy X-* prefixes).
 *
 * @param {HttpHeaders} headers
 * @returns {{ signature: string | undefined, timestamp: string | undefined, webhookId: string | undefined }}
 */
function resolveWebhookHeaders(headers) {
  return {
    signature:
      getHeader(headers, "webhook-signature") ||
      getHeader(headers, "svix-signature") ||
      getHeader(headers, "x-dodo-signature") ||
      getHeader(headers, "dodo-signature") ||
      getHeader(headers, "x-webhook-signature"),
    timestamp:
      getHeader(headers, "webhook-timestamp") ||
      getHeader(headers, "svix-timestamp") ||
      getHeader(headers, "x-webhook-timestamp"),
    webhookId:
      getHeader(headers, "webhook-id") ||
      getHeader(headers, "svix-id") ||
      getHeader(headers, "x-webhook-id"),
  };
}

module.exports = { getHeader, resolveWebhookHeaders };
