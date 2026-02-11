/**
 * Widget API Client
 * Handles authentication and API communication
 */

import { WidgetConfig, WidgetAuthResponse } from './types';

export class WidgetAPI {
  private config: WidgetConfig;
  private token: string | null = null;

  constructor(config: WidgetConfig) {
    this.config = config;
  }

  /**
   * Generate widget authentication token
   */
  async authenticate(): Promise<string> {
    try {
      const response = await fetch(`${this.config.apiUrl}/api/v1/widget/auth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          voxoraPublicKey: this.config.publicKey,
          origin: window.location.origin
        }),
        credentials: 'omit' // Don't send cookies cross-origin
      });

      if (!response.ok) {
        throw new Error(`Authentication failed: ${response.status}`);
      }

      const data: WidgetAuthResponse = await response.json();
      
      if (data.success && data.data.token) {
        this.token = data.data.token;
        return data.data.token;
      }

      throw new Error('Invalid authentication response');
    } catch (error) {
      console.error('[VoxoraWidget] Authentication error:', error);
      throw error;
    }
  }

  /**
   * Fetch widget configuration
   */
  async fetchConfig(): Promise<any> {
    try {
      const response = await fetch(
        `${this.config.apiUrl}/api/v1/widget/config?voxoraPublicKey=${encodeURIComponent(this.config.publicKey)}`,
        { credentials: 'omit' }
      );

      if (!response.ok) {
        console.warn('[VoxoraWidget] Failed to fetch config');
        return null;
      }

      const data = await response.json();
      return data?.data?.config || null;
    } catch (error) {
      console.warn('[VoxoraWidget] Config fetch error:', error);
      return null;
    }
  }

  /**
   * Get widget iframe URL with authentication
   */
  getWidgetUrl(token: string, widgetConfig: any): string {
    // Determine MinIO URL based on API URL
    // In production, use your CDN domain
    const minioUrl = this.config.apiUrl?.includes('localhost')
      ? 'http://localhost:9001/voxora-widget/v1'
      : 'https://widget.voxora.ai/v1';
    
    const params = new URLSearchParams({
      voxoraPublicKey: this.config.publicKey,
      token,
      apiUrl: this.config.apiUrl! // Pass API URL to widget
    });

    if (widgetConfig) {
      try {
        const cfg = btoa(JSON.stringify(widgetConfig));
        params.append('cfg', cfg);
      } catch (e) {
        console.warn('[VoxoraWidget] Failed to encode config');
      }
    }

    return `${minioUrl}/widget.html?${params.toString()}`;
  }

  getToken(): string | null {
    return this.token;
  }
}
