/**
 * Widget Configuration and Environment
 */

import { WidgetConfig } from './types';

const DEFAULT_CONFIG: Partial<WidgetConfig> = {
  position: 'bottom-right',
  primaryColor: '#667eea',
  apiUrl: 'http://localhost:3002'
};

/**
 * Get API base URL based on environment.
 */
export function getApiUrl(customUrl?: string): string {
  if (customUrl) return customUrl;
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    return 'https://api.voxora.cloud';
  }
  return DEFAULT_CONFIG.apiUrl!;
}

/**
 * Derive the origin where the widget iframe HTML is served from.
 * In production this is the widget CDN; in local dev it's MinIO.
 */
export function getWidgetOrigin(apiUrl: string): string {
  if (apiUrl.includes('localhost')) return 'http://localhost:9001';
  return 'https://widget.voxora.ai';
}

/**
 * Build the base URL for the widget iframe HTML file.
 */
export function getWidgetBaseUrl(apiUrl: string): string {
  return `${getWidgetOrigin(apiUrl)}/voxora-widget/v1`;
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
