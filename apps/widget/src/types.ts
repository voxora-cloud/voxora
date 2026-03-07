/**
 * Voxora Widget Types
 *
 * Types used by the LOADER script (runs on customer domain).
 * The full cross-origin protocol is in protocol.ts.
 */

// ─── Config ───────────────────────────────────────────────────────────────────

/** Configuration parsed from the <script> tag on the customer's page. */
export interface WidgetConfig {
  /** Public widget key — identifies the widget config; NOT a secret */
  publicKey: string;
  /** Floating button position */
  position?: 'bottom-right' | 'bottom-left';
  /** Override button accent color */
  primaryColor?: string;
  // The following are populated from the API response, not the script tag:
  displayName?: string;
  logoUrl?: string;
  backgroundColor?: string;
  apiUrl?: string;
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
