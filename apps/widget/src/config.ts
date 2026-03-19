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
  return `${getWidgetOrigin(apiUrl, cdnUrl)}/voxora-widget/v1`;
}

/**
 * Parse widget configuration from script tag.
 *
 * Required:
 *   - data-voxora-public-key
 *
 * Optional:
 *   - data-voxora-api-url
 *   - data-voxora-cdn-url
 */
export function parseWidgetConfig(): WidgetConfig | null {
  try {
    const script = document.querySelector(
      "script[data-voxora-public-key]",
    ) as HTMLScriptElement | null;

    if (!script) {
      console.error("[VoxoraWidget] Script tag with data-voxora-public-key not found");
      return null;
    }

    const publicKey = script.getAttribute("data-voxora-public-key");
    if (!publicKey) {
      console.error("[VoxoraWidget] data-voxora-public-key is required");
      return null;
    }

    // Optional CDN override from attribute; fallback to script src origin.
    let cdnUrl = script.getAttribute("data-voxora-cdn-url") || undefined;
    if (!cdnUrl && script.src) {
      try {
        cdnUrl = new URL(script.src).origin;
      } catch {
        // Ignore parse failure; fallback logic handles it.
      }
    }

    const apiUrl = getApiUrl(script.getAttribute("data-voxora-api-url") || undefined);

    const config: WidgetConfig = {
      publicKey,
      apiUrl,
      cdnUrl,
    };

    return config;
  } catch (error) {
    console.error("[VoxoraWidget] Error parsing config:", error);
    return null;
  }
}
