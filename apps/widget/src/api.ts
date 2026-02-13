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
  getWidgetUrl(token: string, sessionId: string, widgetConfig: any): string {
    // Determine MinIO URL based on API URL
    // In production, use your CDN domain
    const minioUrl = this.config.apiUrl?.includes('localhost')
      ? 'http://localhost:9001/voxora-widget/v1'
      : 'https://widget.voxora.ai/v1';
    
    const params = new URLSearchParams({
      voxoraPublicKey: this.config.publicKey,
      token,
      sessionId,  // Pass sessionId from parent window
      apiUrl: this.config.apiUrl!, // Pass API URL to widget
      _t: Date.now().toString() // Cache-busting timestamp
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

  /**
   * Update visitor information for a conversation
   */
  async updateVisitorInfo(conversationId: string, sessionId: string, name: string, email: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.config.apiUrl}/api/v1/conversations/${conversationId}/visitor`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name,
            email,
            sessionId
          }),
          credentials: 'omit'
        }
      );

      if (!response.ok) {
        console.error('[VoxoraWidget] Failed to update visitor info:', response.status);
        return false;
      }

      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('[VoxoraWidget] Error updating visitor info:', error);
      return false;
    }
  }

  /**
   * Get conversations for current sessionId
   */
  async getConversations(sessionId: string, token: string): Promise<any[]> {
    try {
      const response = await fetch(
        `${this.config.apiUrl}/api/v1/widget/conversations?sessionId=${encodeURIComponent(sessionId)}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          credentials: 'omit'
        }
      );

      if (!response.ok) {
        console.error('[VoxoraWidget] Failed to fetch conversations:', response.status);
        return [];
      }

      const data = await response.json();
      return data.data?.conversations || [];
    } catch (error) {
      console.error('[VoxoraWidget] Error fetching conversations:', error);
      return [];
    }
  }

  /**
   * Get messages for a specific conversation
   */
  async getMessages(conversationId: string, sessionId: string, token: string): Promise<any[]> {
    try {
      const response = await fetch(
        `${this.config.apiUrl}/api/v1/widget/conversations/${conversationId}/messages?sessionId=${encodeURIComponent(sessionId)}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          credentials: 'omit'
        }
      );

      if (!response.ok) {
        console.error('[VoxoraWidget] Failed to fetch messages:', response.status);
        return [];
      }

      const data = await response.json();
      return data.data?.messages || [];
    } catch (error) {
      console.error('[VoxoraWidget] Error fetching messages:', error);
      return [];
    }
  }

  getToken(): string | null {
    return this.token;
  }
}
