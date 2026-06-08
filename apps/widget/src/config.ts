/**
 * Widget Configuration and Environment
 */

import type { WidgetConfig } from "./types";

// Runtime placeholders replaced by entrypoint.sh in production Docker builds
const RUNTIME_API_URL = "__API_URL_PRODUCTION__";
const RUNTIME_CDN_URL = "__CDN_URL_PRODUCTION__";

const LOCAL_API_URL = "http://localhost:3002";
const LOCAL_CDN_URL = "http://localhost:9001";

function isInjectedValue(value: string): boolean {
  return !!value && !value.startsWith("__");
}

function toBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  return undefined;
}

interface WindowInteraOneConfig {
  publicKey?: string;
  InteraOnePublicKey?: string;
  apiUrl?: string;
  cdnUrl?: string;
  source?: string;
  fullscreen?: boolean;
  autoOpen?: boolean;
}

function normalizeSource(value: unknown, fallback: WidgetConfig["source"]): WidgetConfig["source"] {
  if (typeof value !== "string") return fallback;
  const normalized = value.trim().toLowerCase();
  if (normalized === "widget" || normalized === "qr" || normalized === "link" || normalized === "unknown") {
    return normalized;
  }
  return fallback;
}

export function getApiUrl(customUrl?: string): string {
  // 1. Explicit override from script tag
  if (customUrl) return customUrl;

  // 2. Runtime-injected production value
  if (isInjectedValue(RUNTIME_API_URL)) return RUNTIME_API_URL;

  // 3. Local development fallback
  return LOCAL_API_URL;
}

export function getWidgetOrigin(apiUrl: string, cdnUrl?: string): string {
  // 1. Explicit CDN override from script tag
  if (cdnUrl) return cdnUrl.replace(/\/$/, "");

  // 2. Runtime-injected production value
  if (isInjectedValue(RUNTIME_CDN_URL)) return RUNTIME_CDN_URL.replace(/\/$/, "");

  // 3. Local development fallback
  if (apiUrl.includes("localhost") || apiUrl.includes("127.0.0.1")) {
    return LOCAL_CDN_URL;
  }

  // 4. Self-hosted fallback: derive from API URL with port 9001
  try {
    const url = new URL(apiUrl);
    return `${url.protocol}//${url.hostname}:9001`;
  } catch {
    return LOCAL_CDN_URL;
  }
}

export function getWidgetBaseUrl(apiUrl: string, cdnUrl?: string): string {
  return `${getWidgetOrigin(apiUrl, cdnUrl)}/interaone-widget/v1`;
}

/**
 * Parse widget configuration from script tag.
 *
 * Required:
 *   - data-InteraOne-public-key
 *
 * Optional:
 *   - data-InteraOne-api-url
 *   - data-InteraOne-cdn-url
 */
export function parseWidgetConfig(): WidgetConfig | null {
  try {
    const globalConfig = ((window as Window & { InteraOneConfig?: WindowInteraOneConfig }).InteraOneConfig) || {};

    const script =
      (document.querySelector("script[data-InteraOne-public-key]") as HTMLScriptElement | null) ||
      (document.currentScript as HTMLScriptElement | null) ||
      Array.from(document.scripts).find((candidate) => candidate.src.includes("InteraOne.js")) ||
      null;

    const publicKey =
      globalConfig.publicKey ||
      globalConfig.InteraOnePublicKey ||
      script?.getAttribute("data-InteraOne-public-key") ||
      script?.getAttribute("data-InteraOne-publickey") ||
      null;

    if (!publicKey) {
      console.error("[InteraOneWidget] publicKey is required (window.InteraOneConfig.publicKey or data-InteraOne-public-key)");
      return null;
    }

    // Optional CDN override from attribute; fallback to script src origin.
    let cdnUrl =
      globalConfig.cdnUrl ||
      script?.getAttribute("data-InteraOne-cdn-url") ||
      undefined;

    if (!cdnUrl && script?.src) {
      try {
        cdnUrl = new URL(script.src).origin;
      } catch {
        // Ignore parse failure; fallback logic handles it.
      }
    }

    const apiUrl = getApiUrl(
      globalConfig.apiUrl ||
      script?.getAttribute("data-InteraOne-api-url") ||
      undefined,
    );

    const fullscreen =
      toBoolean(globalConfig.fullscreen) ??
      toBoolean(script?.getAttribute("data-InteraOne-fullscreen")) ??
      false;

    const autoOpen =
      toBoolean(globalConfig.autoOpen) ??
      toBoolean(script?.getAttribute("data-InteraOne-auto-open"));

    const source = normalizeSource(
      globalConfig.source || script?.getAttribute("data-InteraOne-source"),
      "widget",
    );

    const config: WidgetConfig = {
      publicKey,
      apiUrl,
      cdnUrl,
      fullscreen,
      autoOpen,
      source,
    };

    return config;
  } catch (error) {
    console.error("[InteraOneWidget] Error parsing config:", error);
    return null;
  }
}
