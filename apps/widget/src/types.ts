/**
 * Voxora Widget Types
 *
 * Types used by the LOADER script (runs on customer domain).
 * The full cross-origin protocol is in protocol.ts.
 */

// ─── Config ───────────────────────────────────────────────────────────────────

/** Configuration parsed from the <script> tag on the customer's page. */
export interface WidgetConfig {
  /** Voxora API base URL (e.g. https://api.voxora.ai or http://localhost:3002) */
  apiUrl?: string;
  /** Public widget key — identifies the widget config; NOT a secret */
  publicKey: string;
  /** Floating button position */
  position?: 'bottom-right' | 'bottom-left';
  /** Override button accent color */
  primaryColor?: string;
  /** Optional CDN/MinIO public URL override for the widget iframe origin.
   *  Set via data-voxora-cdn-url on the script tag for self-hosted deployments.
   *  e.g. http://3.111.24.80:9001  */
  cdnUrl?: string;
  // The following are populated from the API response, not the script tag:
  displayName?: string;
  logoUrl?: string;
  backgroundColor?: string;
}

// ─── State ────────────────────────────────────────────────────────────────────

/**
 * Mutable state tracked by the loader.
 * Passed by reference into WidgetUI so both stay in sync.
 */
export interface WidgetState {
  /** Whether the widget panel is currently visible */
  isOpen: boolean;
  /** Current badge count (updated via UNREAD_COUNT messages) */
  unreadCount: number;
  /**
   * @deprecated — the loader no longer holds an auth token.
   * Tokens are managed entirely inside the iframe session.
   * Kept for API compatibility; always null after the refactor.
   */
  token: string | null;
  /** @deprecated — conversations are managed inside the iframe. */
  conversationId: string | null;
}

// ─── API response shapes ──────────────────────────────────────────────────────

/** Shape of GET /api/v1/widget/config response */
export interface WidgetConfigApiResponse {
  success: boolean;
  data?: {
    config?: {
      displayName?: string;
      backgroundColor?: string;
      logoUrl?: string;
      primaryColor?: string;
    };
  };
}

/**
 * @deprecated — kept only so any remaining references compile.
 * The loader no longer calls the auth token endpoint.
 */
export interface WidgetAuthResponse {
  success: boolean;
  data: {
    token: string;
    config?: {
      displayName: string;
      backgroundColor: string;
      logoUrl: string;
    };
  };
}
