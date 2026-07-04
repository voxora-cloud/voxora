/**
 * InteraOne Widget postMessage Protocol v1
 *
 * All cross-origin communication between the loader script (customer domain)
 * and the widget iframe (InteraOne domain) goes through this typed protocol.
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
 *                iframe sends CLOSE_WIDGET / OPEN_WIDGET
 */

import type { WidgetServerConfig } from './types';

export const PROTOCOL_VERSION = '1' as const;

// ─── Parent → Iframe messages ─────────────────────────────────────────────────

/**
 * INIT_WIDGET — sent once, immediately after the iframe signals WIDGET_READY.
 *
 * Contains everything the iframe needs to bootstrap a session:
 *   - publicKey: identifies the widget configuration on the backend
 *   - apiUrl: InteraOne API base URL
 *   - visitorId: stable anonymous ID, read from parent localStorage by the loader
 *   - pageUrl / pageTitle: initial page context
 *   - source: AI interaction source for analytics attribution
 *   - appearance: branding config fetched by the loader from the public API
 */
export interface InitWidgetMessage {
  type: 'INIT_WIDGET';
  version: typeof PROTOCOL_VERSION;
  payload: {
    publicKey: string;
    apiUrl: string;
    visitorId: string;
    pageUrl: string;
    pageTitle: string;
    source?: 'widget' | 'qr' | 'link';
    appearance?: WidgetServerConfig;
  };
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
 * SHOW_SKELETON — instructs the iframe to show the intentional open skeleton.
 */
export interface ShowSkeletonMessage {
  type: 'SHOW_SKELETON';
  version: typeof PROTOCOL_VERSION;
  payload?: {
    durationMs?: number;
  };
}

/**
 * PAGE_HTML_RESPONSE — loader responds to REQUEST_PAGE_HTML with a
 * trimmed snapshot of the host page's body HTML (capped at 16 KB).
 */
export interface PageHtmlResponseMessage {
  type: 'PAGE_HTML_RESPONSE';
  version: typeof PROTOCOL_VERSION;
  payload: {
    html: string;
  };
}

export type ParentToIframeMessage =
  | InitWidgetMessage
  | PageChangeMessage
  | ShowSkeletonMessage
  | PageHtmlResponseMessage;

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
 * RESIZE_WIDGET — iframe requests a specific iframe container size.
 * Useful for welcome-screen vs full-chat sizing.
 */
export interface ResizeWidgetMessage {
  type: 'RESIZE_WIDGET';
  version: typeof PROTOCOL_VERSION;
  payload: {
    width: number;
    height: number;
    centered?: boolean;
  };
}

/**
 * REQUEST_PAGE_HTML — iframe asks the loader script to capture
 * the host page's document.body.outerHTML and return it.
 * Only honoured when endUserDomAccess is enabled in the widget config.
 */
export interface RequestPageHtmlMessage {
  type: 'REQUEST_PAGE_HTML';
  version: typeof PROTOCOL_VERSION;
}

export type IframeToParentMessage =
  | WidgetReadyMessage
  | CloseWidgetMessage
  | OpenWidgetMessage
  | ResizeWidgetMessage
  | RequestPageHtmlMessage;

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
