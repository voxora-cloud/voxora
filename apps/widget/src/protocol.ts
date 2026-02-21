/**
 * Voxora Widget postMessage Protocol v1
 *
 * All cross-origin communication between the loader script (customer domain)
 * and the widget iframe (Voxora domain) goes through this typed protocol.
 *
 * Security guarantees:
 *   - Every message carries a `version` field; unknown versions are silently dropped.
 *   - The loader validates event.origin === iframeOrigin before processing.
 *   - The iframe validates event.origin === parentOrigin (from URL param) before processing.
 *   - No wildcard origins ('*') are used in production.
 *
 * Communication flow:
 *   1. Iframe loads  →  sends WIDGET_READY to parent
 *   2. Parent        →  sends INIT_WIDGET with visitor context
 *   3. Iframe bootstraps session internally, connects WebSocket
 *   4. Ongoing:  parent sends USER_IDENTITY / PAGE_CHANGE / CUSTOM_EVENT
 *                iframe sends CLOSE_WIDGET / OPEN_WIDGET / UNREAD_COUNT
 */

export const PROTOCOL_VERSION = '1' as const;

// ─── Shared payload types ─────────────────────────────────────────────────────

/**
 * An explicit user identity set by the host page via `Voxora.identify()`.
 * All fields are optional; the widget will work in anonymous mode without them.
 */
export interface UserIdentity {
  userId?: string;
  email?: string;
  name?: string;
  // Allow arbitrary string/number/boolean traits (NOT objects — keep postMessage lean)
  [key: string]: string | number | boolean | undefined;
}

/**
 * Visual appearance settings fetched from the Voxora API and forwarded to the iframe.
 * The iframe uses these to style itself consistently with the customer's brand.
 */
export interface WidgetAppearance {
  displayName?: string;
  logoUrl?: string;
  primaryColor?: string;
  backgroundColor?: string;
}

// ─── Parent → Iframe messages ─────────────────────────────────────────────────

/**
 * INIT_WIDGET — sent once, immediately after the iframe signals WIDGET_READY.
 *
 * Contains everything the iframe needs to bootstrap a session:
 *   - publicKey: identifies the widget configuration on the backend
 *   - apiUrl: Voxora API base URL
 *   - visitorId: stable anonymous ID, read from parent localStorage by the loader
 *   - identity: optional explicit user identity (set via Voxora.identify())
 *   - pageUrl / pageTitle: initial page context
 *   - appearance: branding config fetched by the loader from the public API
 */
export interface InitWidgetMessage {
  type: 'INIT_WIDGET';
  version: typeof PROTOCOL_VERSION;
  payload: {
    publicKey: string;
    apiUrl: string;
    visitorId: string;
    identity?: UserIdentity;
    pageUrl: string;
    pageTitle: string;
    appearance?: WidgetAppearance;
  };
}

/**
 * USER_IDENTITY — sent when the host page calls `Voxora.identify()` after init.
 * The iframe merges this into the current session and notifies the backend.
 */
export interface UserIdentityMessage {
  type: 'USER_IDENTITY';
  version: typeof PROTOCOL_VERSION;
  payload: UserIdentity;
}

/**
 * PAGE_CHANGE — sent when the URL changes in a SPA.
 * Allows the iframe to track page context across navigation without reloading.
 */
export interface PageChangeMessage {
  type: 'PAGE_CHANGE';
  version: typeof PROTOCOL_VERSION;
  payload: {
    pageUrl: string;
    pageTitle: string;
  };
}

/**
 * CUSTOM_EVENT — host page can emit named events that trigger automations.
 * e.g. Voxora.track('checkout_completed', { value: 99 })
 */
export interface CustomEventMessage {
  type: 'CUSTOM_EVENT';
  version: typeof PROTOCOL_VERSION;
  payload: {
    name: string;
    properties?: Record<string, string | number | boolean>;
  };
}

export type ParentToIframeMessage =
  | InitWidgetMessage
  | UserIdentityMessage
  | PageChangeMessage
  | CustomEventMessage;

// ─── Iframe → Parent messages ─────────────────────────────────────────────────

/**
 * WIDGET_READY — first message from the iframe after it finishes loading.
 * The loader MUST wait for this before sending INIT_WIDGET.
 */
export interface WidgetReadyMessage {
  type: 'WIDGET_READY';
  version: typeof PROTOCOL_VERSION;
}

/**
 * CLOSE_WIDGET — iframe requests the loader to hide the iframe container.
 * Triggered when the user clicks the minimize button inside the chat.
 */
export interface CloseWidgetMessage {
  type: 'CLOSE_WIDGET';
  version: typeof PROTOCOL_VERSION;
}

/**
 * OPEN_WIDGET — iframe requests the loader to reveal the iframe container.
 * Could be triggered by an incoming message notification.
 */
export interface OpenWidgetMessage {
  type: 'OPEN_WIDGET';
  version: typeof PROTOCOL_VERSION;
}

/**
 * UNREAD_COUNT — iframe reports the current count of unread messages.
 * The loader renders this on the floating button badge.
 */
export interface UnreadCountMessage {
  type: 'UNREAD_COUNT';
  version: typeof PROTOCOL_VERSION;
  payload: {
    count: number;
  };
}

/**
 * RESIZE_WIDGET — iframe requests a specific iframe container size.
 * Useful for welcome-screen vs full-chat sizing.
 */
export interface ResizeWidgetMessage {
  type: 'RESIZE_WIDGET';
  version: typeof PROTOCOL_VERSION;
  payload: {
    width: number;
    height: number;
  };
}

export type IframeToParentMessage =
  | WidgetReadyMessage
  | CloseWidgetMessage
  | OpenWidgetMessage
  | UnreadCountMessage
  | ResizeWidgetMessage;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Type guard for parent→iframe messages (used inside the iframe).
 */
export function isParentMessage(data: unknown): data is ParentToIframeMessage {
  return (
    typeof data === 'object' &&
    data !== null &&
    'type' in data &&
    'version' in data &&
    (data as ParentToIframeMessage).version === PROTOCOL_VERSION
  );
}

/**
 * Type guard for iframe→parent messages (used in the loader).
 */
export function isIframeMessage(data: unknown): data is IframeToParentMessage {
  return (
    typeof data === 'object' &&
    data !== null &&
    'type' in data &&
    'version' in data &&
    (data as IframeToParentMessage).version === PROTOCOL_VERSION
  );
}
