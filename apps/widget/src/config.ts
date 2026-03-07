/**
 * Widget Configuration and Environment
 */

import type { WidgetConfig } from './types';

// Runtime placeholders replaced by entrypoint.sh in production Docker builds
const RUNTIME_API_URL = '__API_URL_PRODUCTION__';
const RUNTIME_CDN_URL = '__CDN_URL_PRODUCTION__';

const DEFAULT_CONFIG: Partial<WidgetConfig> = {
  position: 'bottom-right',
  primaryColor: '#667eea',
  apiUrl: 'http://localhost:3002'
};

export function getApiUrl(customUrl?: string): string {
  // 1. Use explicitly provided URL (from script data attribute)
  if (customUrl) return customUrl;
  
  // 2. Use runtime-injected production URL (if replaced by entrypoint.sh)
  if (RUNTIME_API_URL && !RUNTIME_API_URL.startsWith('__')) {
    return RUNTIME_API_URL;
  }
  
  // 3. Fall back to default (local dev)
  return DEFAULT_CONFIG.apiUrl!;
}

/**
 * Derive the origin where the widget iframe HTML is served from.
 * - localhost dev  → http://localhost:9001  (local MinIO)
 * - production     → CDN subdomain (e.g., https://cdn.voxora.cloud)
 * Can be overridden with data-voxora-cdn-url on the script tag.
 */
export function getWidgetOrigin(apiUrl: string, cdnUrl?: string): string {
  // 1. Explicit CDN URL from script attribute
  if (cdnUrl) return cdnUrl.replace(/\/$/, '');
  
  // 2. Runtime-injected CDN URL (production)
  if (RUNTIME_CDN_URL && !RUNTIME_CDN_URL.startsWith('__')) {
    return RUNTIME_CDN_URL;
  }
  
  // 3. Localhost development
  if (apiUrl.includes('localhost')) return 'http://localhost:9001';
  
  // 4. Self-hosted fallback: derive from API URL (same host, port 9001)
  try {
    const url = new URL(apiUrl);
    return `${url.protocol}//${url.hostname}:9001`;
  } catch {
    return 'http://localhost:9001';
  }
}

/**
 * Build the base URL for the widget iframe HTML file.
 */
export function getWidgetBaseUrl(apiUrl: string, cdnUrl?: string): string {
  return `${getWidgetOrigin(apiUrl, cdnUrl)}/voxora-widget/v1`;
}

/**
 * Parse widget configuration from script tag
 */
export function parseWidgetConfig(): WidgetConfig | null {
  try {
    const script = document.querySelector('script[data-voxora-public-key]') as HTMLScriptElement | null;

    if (!script) {
      console.error('[VoxoraWidget] Script tag with data-voxora-public-key not found');
      return null;
    }

    const publicKey = script.getAttribute('data-voxora-public-key');
    if (!publicKey) {
      console.error('[VoxoraWidget] data-voxora-public-key is required');
      return null;
    }

    let cdnUrl = script.getAttribute('data-voxora-cdn-url');
    if (!cdnUrl && script.src) {
      try {
        const url = new URL(script.src);
        cdnUrl = url.origin; // e.g., 'http://localhost:9001' or 'https://assets.voxora.cloud'
      } catch (e) {
        // ignore invalid URL
      }
    }

    const config: WidgetConfig = {
      publicKey,
      apiUrl: script.getAttribute('data-voxora-api-url') || getApiUrl(),
      position: (script.getAttribute('data-voxora-position') as any) || DEFAULT_CONFIG.position,
      primaryColor: script.getAttribute('data-voxora-color') || DEFAULT_CONFIG.primaryColor,
      logoUrl: script.getAttribute('data-voxora-logo-url') || undefined,
      backgroundColor: script.getAttribute('data-voxora-background-color') || undefined,
    };

    return config;
  } catch (error) {
    console.error('[VoxoraWidget] Error parsing config:', error);
    return null;
  }
}

/**
 * Validate origin for security
 */
export function isValidOrigin(origin: string, allowedOrigins: string[]): boolean {
  // Allow widget iframe origin
  if (allowedOrigins.includes('*')) return true;
  return allowedOrigins.some(allowed => origin === allowed || origin.endsWith(allowed));
}
