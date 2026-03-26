/**
 * Voxora Widget - Main Entry Point
 * Embeddable chat widget with iframe isolation and secure cross-origin communication
 * 
 * @example
 * ```html
 * <script src="https://widget.voxora.ai/v1/voxora.js" 
 *         data-voxora-public-key="your-key"
 *         async>
 * </script>
 * ```
 */

import { parseWidgetConfig, getWidgetOrigin } from './config';
import { WidgetAPI } from './api';
import { WidgetUI } from './ui';
import { WidgetState } from './types';
import {
  getOrCreateVisitorId,
  setIdentity,
  getIdentity,
  clearIdentity,
  StoredIdentity,
} from './session';
import {
  PROTOCOL_VERSION,
  InitWidgetMessage,
  UserIdentityMessage,
  PageChangeMessage,
  CustomEventMessage,
  IframeToParentMessage,
  isIframeMessage,
  WidgetAppearance,
  PageHtmlResponseMessage,
} from './protocol';

type QueuedMessage = InitWidgetMessage | UserIdentityMessage | PageChangeMessage | CustomEventMessage;

class VoxoraLoader {
  private api: WidgetAPI;
  private ui: WidgetUI;
  private state: WidgetState;
  private readonly iframeOrigin: string;
  private iframe: HTMLIFrameElement | null = null;
  private iframeReady = false;
  private pendingMessages: QueuedMessage[] = [];
  private visitorId: string;
  private identity: StoredIdentity | null;
  private lastPageUrl: string;
  private appearance: WidgetAppearance | null = null;
  private allowHostDomAccess = true;
  private fullscreenMode = false;

  constructor() {
    const config = parseWidgetConfig();
    if (!config) {
      console.error('[VoxoraWidget] Invalid config — widget not loaded.');
      this.state = { isOpen: false, unreadCount: 0 };
      this.api = null as unknown as WidgetAPI;
      this.ui = null as unknown as WidgetUI;
      this.iframeOrigin = '';
      this.visitorId = '';
      this.identity = null;
      this.lastPageUrl = '';
      return;
    }

    this.state = { isOpen: false, unreadCount: 0 };
    this.api = new WidgetAPI(config);
    this.ui = new WidgetUI(config, this.state);
    this.iframeOrigin = getWidgetOrigin(config.apiUrl!, config.cdnUrl);
    this.fullscreenMode = config.fullscreen === true;
    this.lastPageUrl = "";
    this.visitorId = "";
    this.identity = null;

    this.init().catch(err => console.error('[VoxoraWidget] Init error:', err));
  }

  private async init(): Promise<void> {
    const cfg = await this.api.fetchConfig().catch(() => null);
    if (cfg) {
      this.appearance = cfg;
      this.ui.applyServerConfig(this.appearance);
    }

    const behavior = this.appearance?.behavior;
    if (!this.shouldRenderForCurrentDevice(behavior)) {
      return;
    }

    // DOM access (localStorage/history/title/page URL tracking) is gated by config.
    this.allowHostDomAccess = this.appearance?.features?.endUserDomAccess !== false;
    if (this.allowHostDomAccess) {
      this.visitorId = getOrCreateVisitorId();
      this.identity = getIdentity();
      this.lastPageUrl = window.location.href;
    } else {
      this.visitorId = this.generateEphemeralVisitorId();
      this.identity = null;
      this.lastPageUrl = "";
    }

    // Register message handler BEFORE creating the iframe.
    // The iframe fires WIDGET_READY as soon as its DOM is ready — if we register
    // the listener after createIframe(), a fast-loading iframe (e.g. from cache)
    // can fire WIDGET_READY before the listener exists, silently dropping the
    // message and leaving the widget stuck on "Connecting..." indefinitely.
    this.setupMessageHandlers();
    this.setupPageChangeDetection();

    if (!this.fullscreenMode) {
      this.ui.createButton();
    }
    this.iframe = this.ui.createIframe(this.api.getWidgetUrl(window.location.origin));

    const shouldAutoOpen = this.api.getConfig().autoOpen ?? behavior?.autoOpen;
    if (this.fullscreenMode || shouldAutoOpen) {
      this.open();
    }
  }

  private setupMessageHandlers(): void {
    window.addEventListener('message', (event: MessageEvent) => {
      if (event.origin !== this.iframeOrigin) return;
      if (this.iframe && event.source !== this.iframe.contentWindow) return;
      if (!isIframeMessage(event.data)) return;

      const msg: IframeToParentMessage = event.data;
      switch (msg.type) {
        case 'WIDGET_READY':
          this.onIframeReady();
          break;
        case 'CLOSE_WIDGET':
          if (this.fullscreenMode) {
            break;
          }
          this.ui.close();
          this.state.isOpen = false;
          break;
        case 'OPEN_WIDGET':
          this.ui.open();
          this.state.isOpen = true;
          break;
        case 'UNREAD_COUNT':
          this.state.unreadCount = msg.payload.count;
          this.ui.setUnreadCount(msg.payload.count);
          break;
        case 'RESIZE_WIDGET':
          this.ui.resizeFromIframe(
            msg.payload.width,
            msg.payload.height,
            msg.payload.centered === true,
          );
          break;
        case 'REQUEST_PAGE_HTML': {
          // Only service the request when DOM access is permitted by config
          if (this.appearance?.features?.endUserDomAccess) {
            const MAX_HTML_BYTES = 16_384; // 16 KB cap
            let html = document.body?.outerHTML ?? '';
            // Strip script and style content to keep payload lean and safe
            html = html
              .replace(/<script[\s\S]*?<\/script>/gi, '')
              .replace(/<style[\s\S]*?<\/style>/gi, '')
              .trim();
            if (html.length > MAX_HTML_BYTES) {
              html = html.slice(0, MAX_HTML_BYTES) + '<!-- [TRUNCATED] -->';
            }
            const reply: PageHtmlResponseMessage = {
              type: 'PAGE_HTML_RESPONSE',
              version: PROTOCOL_VERSION,
              payload: { html },
            };
            this.iframe?.contentWindow?.postMessage(reply, this.iframeOrigin);
          }
          break;
        }
        default:
          break;
      }
    });
  }

  private onIframeReady(): void {
    this.iframeReady = true;
    for (const msg of this.pendingMessages) this.dispatchToIframe(msg);
    this.pendingMessages = [];
    this.dispatchToIframe({
      type: 'INIT_WIDGET',
      version: PROTOCOL_VERSION,
      payload: {
        publicKey: this.api.getConfig().publicKey,
        apiUrl: this.api.getConfig().apiUrl!,
        visitorId: this.visitorId,
        identity: this.identity ?? undefined,
        pageUrl: this.getCurrentPageUrl(),
        pageTitle: this.getCurrentPageTitle(),
        appearance: this.appearance ?? undefined,
      },
    } as InitWidgetMessage);
  }

  private setupPageChangeDetection(): void {
    if (!this.allowHostDomAccess) return;

    const report = () => {
      const url = window.location.href;
      if (url === this.lastPageUrl) return;
      this.lastPageUrl = url;
      this.queueOrSend({ type: 'PAGE_CHANGE', version: PROTOCOL_VERSION, payload: { pageUrl: url, pageTitle: document.title } } as PageChangeMessage);
    };
    const orig = { push: history.pushState.bind(history), replace: history.replaceState.bind(history) };
    history.pushState = (...a: Parameters<typeof history.pushState>) => { orig.push(...a); report(); };
    history.replaceState = (...a: Parameters<typeof history.replaceState>) => { orig.replace(...a); report(); };
    window.addEventListener('popstate', report);
    window.addEventListener('hashchange', report);
  }

  private dispatchToIframe(msg: QueuedMessage): void {
    this.iframe?.contentWindow?.postMessage(msg, this.iframeOrigin);
  }

  private queueOrSend(msg: QueuedMessage): void {
    if (this.iframeReady) this.dispatchToIframe(msg);
    else this.pendingMessages.push(msg);
  }

  open() { this.ui.open(); this.state.isOpen = true; }
  close() { this.ui.close(); this.state.isOpen = false; }
  toggle() { this.state.isOpen ? this.close() : this.open(); }

  identify(userId: string, traits: Omit<StoredIdentity, 'userId'> = {}): void {
    const identity: StoredIdentity = { userId, ...traits };
    this.identity = identity;
    if (this.allowHostDomAccess) setIdentity(identity);
    this.queueOrSend({ type: 'USER_IDENTITY', version: PROTOCOL_VERSION, payload: identity } as UserIdentityMessage);
  }

  reset(): void {
    this.identity = null;
    if (this.allowHostDomAccess) clearIdentity();
    this.queueOrSend({ type: 'USER_IDENTITY', version: PROTOCOL_VERSION, payload: {} } as UserIdentityMessage);
  }

  track(name: string, properties: Record<string, string | number | boolean> = {}): void {
    this.queueOrSend({ type: 'CUSTOM_EVENT', version: PROTOCOL_VERSION, payload: { name, properties } } as CustomEventMessage);
  }

  private getCurrentPageUrl(): string {
    try {
      return window.location.href || "";
    } catch {
      return "";
    }
  }

  private getCurrentPageTitle(): string {
    try {
      return document.title || "";
    } catch {
      return "";
    }
  }

  private isMobileView(): boolean {
    return window.matchMedia("(max-width: 768px)").matches;
  }

  private shouldRenderForCurrentDevice(
    behavior: WidgetAppearance["behavior"] | undefined,
  ): boolean {
    if (!behavior) return true;
    if (this.isMobileView()) return behavior.showOnMobile !== false;
    return behavior.showOnDesktop !== false;
  }

  private generateEphemeralVisitorId(): string {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return `v_${crypto.randomUUID().replace(/-/g, "")}`;
    }
    return `v_${Math.random().toString(16).slice(2)}${Date.now().toString(16)}`;
  }

  getState(): Readonly<WidgetState> { return { ...this.state }; }
  destroy(): void { this.ui.destroy(); widgetInstance = null; }
}

let widgetInstance: VoxoraLoader | null = null;

function boot(): void {
  if (widgetInstance) return;
  widgetInstance = new VoxoraLoader();

  (window as any).Voxora = {
    open: () => widgetInstance?.open(),
    close: () => widgetInstance?.close(),
    toggle: () => widgetInstance?.toggle(),
    identify: (id: string, t?: object) => widgetInstance?.identify(id, t as any),
    reset: () => widgetInstance?.reset(),
    track: (n: string, p?: object) => widgetInstance?.track(n, p as any),
    getState: () => widgetInstance?.getState(),
    destroy: () => { widgetInstance?.destroy(); widgetInstance = null; delete (window as any).Voxora; },
  };
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
