/**
 * Voxora Widget - Loader API Client
 *
 * This class is responsible ONLY for what the LOADER needs:
 *   1. Fetching the public widget appearance config (no auth required)
 *   2. Building the iframe src URL
 *
 * NOTE: Authentication, session management, WebSocket connections, and
 * conversation API calls all happen inside the iframe (widget.html inline JS).
 * The loader is intentionally kept thin.
 */

import { WidgetConfig } from './types';
import { getWidgetBaseUrl } from './config';

export class WidgetAPI {
  private config: WidgetConfig;

  constructor(config: WidgetConfig) {
    this.config = config;
  }

  /** Expose config read-only so the loader can pass it to protocol messages. */
  getConfig(): Readonly<WidgetConfig> {
    return this.config;
  }

  /**
   * Fetch public widget appearance config.
   *
   * This is a public endpoint; no auth token needed.
   * Returns branding values (displayName, logoUrl, primaryColor, backgroundColor).
   * Called by the loader so it can:
   *   a) Apply branding to the floating button before the iframe loads.
   *   b) Forward the appearance via INIT_WIDGET to the iframe.
   */
  async fetchConfig(): Promise<Record<string, string> | null> {
    try {
      const url = `${this.config.apiUrl}/api/v1/widget/config?voxoraPublicKey=${encodeURIComponent(this.config.publicKey)}`;
      const response = await fetch(url, { credentials: 'omit' });

      if (!response.ok) {
        console.warn('[VoxoraWidget] Config fetch non-ok:', response.status);
        return null;
      }

      const data = await response.json();
      return (data?.data?.config as Record<string, string>) ?? null;
    } catch (err) {
      console.warn('[VoxoraWidget] Config fetch error:', err);
      return null;
    }
  }

  /**
   * Build the iframe src URL.
   *
   * NO secrets are placed in the URL.
   * NO token or sessionId — these live in iframe-domain localStorage.
   *
   * URL params passed to the iframe:
   *   - origin:       the customer page's origin (so iframe knows which postMessage sender to trust)
   *   - publicKey:    widget key (used by iframe as part of its localStorage namespace)
   *   - apiUrl:       backend base URL
   *
   * @param parentOrigin  window.location.origin of the customer page
   */
  getWidgetUrl(parentOrigin: string): string {
    const base = getWidgetBaseUrl(this.config.apiUrl!);

    const params = new URLSearchParams({
      origin:     parentOrigin,
      publicKey:  this.config.publicKey,
      apiUrl:     this.config.apiUrl!,
    });

    return `${base}/widget.html?${params.toString()}`;
  }

}
