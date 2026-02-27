/**
 * Widget Configuration and Environment
 */

import { WidgetConfig } from './types';

const DEFAULT_CONFIG: Partial<WidgetConfig> = {
  position: 'bottom-right',
  primaryColor: '#667eea',
  // Runtime placeholder - replaced by entrypoint.sh at container startup
  apiUrl: '__API_URL_PRODUCTION__'
};

/**
 * Get API base URL based on environment.
 * Placeholder __API_URL_PRODUCTION__ is replaced at container startup via entrypoint.sh
 */
export function getApiUrl(customUrl?: string): string {
  return customUrl || DEFAULT_CONFIG.apiUrl!;
}

/**
 * Derive the origin where the widget iframe HTML is served from.
 * - localhost dev  → http://localhost:9001  (local MinIO)
 * - self-hosted    → same host as apiUrl but on port 9001  (EC2 MinIO)
 * - voxora.cloud   → https://widget.voxora.ai  (managed CDN)
 * Can be overridden with data-voxora-cdn-url on the script tag.
 */
export function getWidgetOrigin(apiUrl: string, cdnUrl?: string): string {
  if (cdnUrl) return cdnUrl.replace(/\/$/, '');
  if (apiUrl.includes('localhost')) return 'http://localhost:9001';
  if (apiUrl.includes('voxora.cloud') || apiUrl.includes('voxora.ai')) return 'https://widget.voxora.ai';
  // Self-hosted: derive MinIO origin from the same hostname, port 9001
  try {
    const url = new URL(apiUrl);
    return `${url.protocol}//${url.hostname}:9001`;
  } catch {
    return 'https://widget.voxora.ai';
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
    const script = document.querySelector('script[data-voxora-public-key]');
    
    if (!script) {
      console.error('[VoxoraWidget] Script tag with data-voxora-public-key not found');
      return null;
    }

    const publicKey = script.getAttribute('data-voxora-public-key');
    if (!publicKey) {
      console.error('[VoxoraWidget] data-voxora-public-key is required');
      return null;
    }

    const config: WidgetConfig = {
      publicKey,
      apiUrl: script.getAttribute('data-voxora-api-url') || getApiUrl(),
      cdnUrl: script.getAttribute('data-voxora-cdn-url') || undefined,
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
