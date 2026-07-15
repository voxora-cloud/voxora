/**
 * InteraOne Widget - Main Entry Point
 * Embeddable chat widget with iframe isolation and secure cross-origin communication
 * 
 * @example
 * ```html
 * <script src="https://widget.InteraOne.ai/v1/InteraOne.js" 
 *         data-InteraOne-public-key="your-key"
 *         async>
 * </script>
 * ```
 */

import { parseWidgetConfig, getWidgetOrigin } from './config';
import { WidgetAPI } from './api';
import { WidgetUI } from './ui';
import { WidgetState, WidgetServerConfig } from './types';
import { shouldShowWidgetOnPage } from './page-visibility';
import {
  PROTOCOL_VERSION,
  InitWidgetMessage,
  PageChangeMessage,
  ShowSkeletonMessage,
  IframeToParentMessage,
  isIframeMessage,
  PageHtmlResponseMessage,
} from './protocol';

type QueuedMessage = InitWidgetMessage | PageChangeMessage | ShowSkeletonMessage;

class InteraOneLoader {
  private api: WidgetAPI;
  private ui: WidgetUI;
  private state: WidgetState;
  private readonly iframeOrigin: string;
  private iframe: HTMLIFrameElement | null = null;
  private iframeReady = false;
  private pendingMessages: QueuedMessage[] = [];
  private lastPageUrl: string;
  private appearance: WidgetServerConfig | null = null;
  private allowHostDomAccess = true;
  private isVisibleForCurrentPage = true;
  private destroyed = false;
  private cleanupCallbacks: Array<() => void> = [];

  constructor() {
    const config = parseWidgetConfig();
    if (!config) {
      console.error('[InteraOneWidget] Invalid config — widget not loaded.');
      this.state = { isOpen: false };
      this.api = null as unknown as WidgetAPI;
      this.ui = null as unknown as WidgetUI;
      this.iframeOrigin = '';
      this.lastPageUrl = '';
      return;
    }

    this.state = { isOpen: false };
    this.api = new WidgetAPI(config);
    this.ui = new WidgetUI(config, this.state);
    this.ui.onToggleChange((isOpen) => {
      if (!isOpen) return;
      this.queueOrSend({
        type: 'SHOW_SKELETON',
        version: PROTOCOL_VERSION,
        payload: { durationMs: 1000 },
      } as ShowSkeletonMessage);
    });
    this.iframeOrigin = getWidgetOrigin(config.apiUrl!, config.cdnUrl);
    this.lastPageUrl = "";

    this.init().catch(err => console.error('[InteraOneWidget] Init error:', err));
  }

  private async init(): Promise<void> {
    const cfg = await this.api.fetchConfig().catch(() => null);
    if (this.destroyed) return;
    if (!cfg) {
      console.error('[InteraOneWidget] Configuration unavailable — widget not loaded.');
      return;
    }
    this.appearance = cfg;
    this.ui.applyServerConfig(this.appearance);

    const behavior = this.appearance?.behavior;
    if (!this.shouldRenderForCurrentDevice(behavior)) {
      return;
    }

    // DOM access (localStorage/history/title/page URL tracking) is gated by config.
    this.allowHostDomAccess = this.appearance?.features?.endUserDomAccess !== false;
    this.lastPageUrl = window.location.href;

    // Register message handler BEFORE creating the iframe.
    // The iframe fires WIDGET_READY as soon as its DOM is ready — if we register
    // the listener after createIframe(), a fast-loading iframe (e.g. from cache)
    // can fire WIDGET_READY before the listener exists, silently dropping the
    // message and leaving the widget stuck on "Connecting..." indefinitely.
    this.setupMessageHandlers();
    this.setupPageChangeDetection();

    this.ui.createButton();
    this.iframe = this.ui.createIframe(this.api.getWidgetUrl(window.location.origin));
    this.syncPageVisibility(window.location.href);

    const shouldAutoOpen =
      !this.isMobileView() && behavior?.autoOpen;
    if (this.isVisibleForCurrentPage && shouldAutoOpen) {
      this.open();
    }
  }

  private setupMessageHandlers(): void {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== this.iframeOrigin) return;
      if (this.iframe && event.source !== this.iframe.contentWindow) return;
      if (!isIframeMessage(event.data)) return;

      const msg: IframeToParentMessage = event.data;
      switch (msg.type) {
        case 'WIDGET_READY':
          this.onIframeReady();
          break;
        case 'CLOSE_WIDGET':
          this.ui.close();
          this.state.isOpen = false;
          break;
        case 'OPEN_WIDGET':
          if (!this.isVisibleForCurrentPage) {
            break;
          }
          this.ui.open();
          this.state.isOpen = true;
          break;
        case 'RESIZE_WIDGET':
          this.ui.resizeFromIframe(
            msg.payload.width,
            msg.payload.height,
            msg.payload.centered === true,
          );
          break;
        case 'CONVERSATION_STATE':
          this.ui.setConversationStarted(msg.payload.started);
          break;
        case 'REQUEST_PAGE_HTML': {
          // Only service the request when DOM access is permitted by config
          if (this.appearance?.features?.endUserDomAccess) {
            const MAX_TEXT_BYTES = 10_000;
            // Target semantic content containers first to avoid noisy headers/footers
            const contentEl = document.querySelector('main') || document.querySelector('article') || document.body;
            let text = contentEl?.innerText ?? '';

            // Clean up excessive whitespace and newlines
            text = text.replace(/\n\s*\n/g, '\n\n').trim();

            if (text.length > MAX_TEXT_BYTES) {
              text = text.slice(0, MAX_TEXT_BYTES) + '\n\n[TRUNCATED]';
            }
            const reply: PageHtmlResponseMessage = {
              type: 'PAGE_HTML_RESPONSE',
              version: PROTOCOL_VERSION,
              payload: { html: text },
            };
            this.iframe?.contentWindow?.postMessage(reply, this.iframeOrigin);
          }
          break;
        }
        default:
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    this.cleanupCallbacks.push(() => window.removeEventListener('message', handleMessage));
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
        pageUrl: this.getCurrentPageUrl(),
        pageTitle: this.getCurrentPageTitle(),
        source: 'widget',
        appearance: this.appearance ?? undefined,
        isMobile: this.isMobileView(),
      },
    } as InitWidgetMessage);
  }

  private setupPageChangeDetection(): void {
    const report = () => {
      const url = window.location.href;
      if (url === this.lastPageUrl) return;
      this.lastPageUrl = url;
      this.syncPageVisibility(url);
      if (this.allowHostDomAccess) {
        this.queueOrSend({ type: 'PAGE_CHANGE', version: PROTOCOL_VERSION, payload: { pageUrl: url, pageTitle: document.title } } as PageChangeMessage);
      }
    };

    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    const patchedPushState = function (
      this: History,
      ...args: Parameters<typeof history.pushState>
    ) {
      const result = originalPushState.apply(this, args);
      report();
      return result;
    } as typeof history.pushState;
    const patchedReplaceState = function (
      this: History,
      ...args: Parameters<typeof history.replaceState>
    ) {
      const result = originalReplaceState.apply(this, args);
      report();
      return result;
    } as typeof history.replaceState;

    history.pushState = patchedPushState;
    history.replaceState = patchedReplaceState;
    window.addEventListener('popstate', report);
    window.addEventListener('hashchange', report);

    this.cleanupCallbacks.push(() => {
      window.removeEventListener('popstate', report);
      window.removeEventListener('hashchange', report);
      if (history.pushState === patchedPushState) {
        history.pushState = originalPushState;
      }
      if (history.replaceState === patchedReplaceState) {
        history.replaceState = originalReplaceState;
      }
    });
  }

  private syncPageVisibility(pageUrl: string): boolean {
    this.isVisibleForCurrentPage = shouldShowWidgetOnPage(
      this.appearance?.behavior,
      pageUrl,
    );
    this.ui.setPageVisibility(this.isVisibleForCurrentPage);
    return this.isVisibleForCurrentPage;
  }

  private dispatchToIframe(msg: QueuedMessage): void {
    this.iframe?.contentWindow?.postMessage(msg, this.iframeOrigin);
  }

  private queueOrSend(msg: QueuedMessage): void {
    if (this.iframeReady) this.dispatchToIframe(msg);
    else this.pendingMessages.push(msg);
  }

  private open() {
    if (!this.isVisibleForCurrentPage) return;
    this.ui.open();
    this.state.isOpen = true;
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
    behavior: NonNullable<WidgetServerConfig>["behavior"] | undefined,
  ): boolean {
    if (behavior?.showWidget === false) return false;
    if (!behavior) return true;
    if (this.isMobileView()) return behavior.showOnMobile !== false;
    return behavior.showOnDesktop !== false;
  }

  destroy(): void {
    this.destroyed = true;
    this.cleanupCallbacks.splice(0).forEach((cleanup) => cleanup());
    this.ui?.destroy();
    this.pendingMessages = [];
    this.iframe = null;
    this.iframeReady = false;
    this.state.isOpen = false;
  }
}

function boot(): void {
  const widgetWindow = window as Window & {
    __InteraOneWidgetLoader?: InteraOneLoader;
  };
  widgetWindow.__InteraOneWidgetLoader?.destroy();
  widgetWindow.__InteraOneWidgetLoader = new InteraOneLoader();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
