/**
 * InteraOne Widget Types
 *
 * Types used by the LOADER script (runs on customer domain).
 * The full cross-origin protocol is in protocol.ts.
 */

// ─── Config ───────────────────────────────────────────────────────────────────

/** Configuration parsed from the <script> tag on the customer's page. */
export interface WidgetConfig {
  /** Public widget key — identifies the widget config; NOT a secret */
  publicKey: string;
  /** Optional explicit CDN origin (inferred from script src when absent). */
  cdnUrl?: string;
  /** Floating button position */
  position?: 'bottom-right' | 'bottom-left';
  /** Override button accent color */

  // The following are populated from the API response, not the script tag:
  displayName?: string;

  appearance?: WidgetServerAppearanceConfig;
  behavior?: WidgetServerBehaviorConfig;
  ai?: WidgetServerAiConfig;
  conversation?: WidgetServerConversationConfig;
  features?: WidgetServerFeatureConfig;
  suggestions?: Array<{ text: string; showOutside: boolean }>;
  apiUrl?: string;
}

export interface WidgetServerAppearanceConfig {
  primaryColor?: string;
  textColor?: string;
  position?: "bottom-right" | "bottom-left";
  launcherText?: string;
  welcomeMessage?: string;
}

export interface WidgetServerBehaviorConfig {
  showWidget?: boolean;
  showOnlyOnSelectedPages?: boolean;
  allowedPageRules?: string[];
  autoOpen?: boolean;
  showOnMobile?: boolean;
  showOnDesktop?: boolean;
}

export interface WidgetServerAiConfig {
  enabled?: boolean;
  fallbackToAgent?: boolean;
}

export interface WidgetServerConversationConfig {
  collectUserInfo?: {
    name?: boolean;
    email?: boolean;
    phone?: boolean;
  };
}

export interface WidgetServerFeatureConfig {
  endUserDomAccess?: boolean;
}

// ─── State ────────────────────────────────────────────────────────────────────

/**
 * Mutable state tracked by the loader.
 * Passed by reference into WidgetUI so both stay in sync.
 */
export interface WidgetState {
  /** Whether the widget panel is currently visible */
  isOpen: boolean;
}

// ─── API response shapes ──────────────────────────────────────────────────────

/** Shape of GET /api/v1/widget/config response */
export interface WidgetConfigApiResponse {
  success: boolean;
  data?: {
    config?: {
      displayName?: string;
      appearance?: WidgetServerAppearanceConfig;
      behavior?: WidgetServerBehaviorConfig;
      ai?: WidgetServerAiConfig;
      conversation?: WidgetServerConversationConfig;
      features?: WidgetServerFeatureConfig;
      suggestions?: Array<{ text: string; showOutside: boolean }>;
    };
  };
}

export type WidgetServerConfig = NonNullable<WidgetConfigApiResponse["data"]>["config"];


export interface WidgetAuthResponse {
  success: boolean;
  data: {
    token: string;
    config?: {
      displayName: string;
    };
  };
}