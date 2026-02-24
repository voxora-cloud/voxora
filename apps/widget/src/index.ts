/**
 * Voxora Widget - Main Entry Point
 * Embeddable chat widget with iframe isolation and secure cross-origin communication
 * 
 * @example
 * ```html
 * <script src="https://widget.voxora.ai/v1/voxora.js" 
 *         data-voxora-public-key="your-key"
 *         data-voxora-api-url="https://api.voxora.ai"
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
  private readonly visitorId: string;
  private identity: StoredIdentity | null;
  private lastPageUrl: string;
  private appearance: WidgetAppearance | null = null;

  constructor() {
    const config = parseWidgetConfig();
    if (!config) {
      console.error('[VoxoraWidget] Invalid config — widget not loaded.');
      this.state        = { isOpen: false, unreadCount: 0, token: null, conversationId: null };
      this.api          = null as unknown as WidgetAPI;
      this.ui           = null as unknown as WidgetUI;
      this.iframeOrigin = '';
      this.visitorId    = '';
      this.identity     = null;
      this.lastPageUrl  = '';
      return;
    }

    this.state        = { isOpen: false, unreadCount: 0, token: null, conversationId: null };
    this.api          = new WidgetAPI(config);
    this.ui           = new WidgetUI(config, this.state);
    this.iframeOrigin = getWidgetOrigin(config.apiUrl!, config.cdnUrl);
    this.lastPageUrl  = window.location.href;

    // ONLY place customer localStorage is read. Values forwarded to iframe via INIT_WIDGET.
    this.visitorId = getOrCreateVisitorId();
    this.identity  = getIdentity();

    this.init().catch(err => console.error('[VoxoraWidget] Init error:', err));
  }

  private async init(): Promise<void> {
    const cfg = await this.api.fetchConfig().catch(() => null);
    if (cfg) {
      this.appearance = cfg as WidgetAppearance;
      this.ui.applyServerConfig(this.appearance);
    }

    // Register message handler BEFORE creating the iframe.
    // The iframe fires WIDGET_READY as soon as its DOM is ready — if we register
    // the listener after createIframe(), a fast-loading iframe (e.g. from cache)
    // can fire WIDGET_READY before the listener exists, silently dropping the
    // message and leaving the widget stuck on "Connecting..." indefinitely.
    this.setupMessageHandlers();
    this.setupPageChangeDetection();

    this.ui.createButton();
    this.iframe = this.ui.createIframe(this.api.getWidgetUrl(window.location.origin));
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
          break;
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
        publicKey:  this.api.getConfig().publicKey,
        apiUrl:     this.api.getConfig().apiUrl!,
        visitorId:  this.visitorId,
        identity:   this.identity ?? undefined,
        pageUrl:    window.location.href,
        pageTitle:  document.title,
        appearance: this.appearance ?? undefined,
      },
    } as InitWidgetMessage);
  }

  private setupPageChangeDetection(): void {
    const report = () => {
      const url = window.location.href;
      if (url === this.lastPageUrl) return;
      this.lastPageUrl = url;
      this.queueOrSend({ type: 'PAGE_CHANGE', version: PROTOCOL_VERSION, payload: { pageUrl: url, pageTitle: document.title } } as PageChangeMessage);
    };
    const orig = { push: history.pushState.bind(history), replace: history.replaceState.bind(history) };
    history.pushState    = (...a: Parameters<typeof history.pushState>)    => { orig.push(...a);    report(); };
    history.replaceState = (...a: Parameters<typeof history.replaceState>) => { orig.replace(...a); report(); };
    window.addEventListener('popstate',   report);
    window.addEventListener('hashchange', report);
  }

  private dispatchToIframe(msg: QueuedMessage): void {
    this.iframe?.contentWindow?.postMessage(msg, this.iframeOrigin);
  }

  private queueOrSend(msg: QueuedMessage): void {
    if (this.iframeReady) this.dispatchToIframe(msg);
    else this.pendingMessages.push(msg);
  }

  open()   { this.ui.open();   this.state.isOpen = true;  }
  close()  { this.ui.close();  this.state.isOpen = false; }
  toggle() { this.state.isOpen ? this.close() : this.open(); }

  identify(userId: string, traits: Omit<StoredIdentity, 'userId'> = {}): void {
    const identity: StoredIdentity = { userId, ...traits };
    this.identity = identity;
    setIdentity(identity);
    this.queueOrSend({ type: 'USER_IDENTITY', version: PROTOCOL_VERSION, payload: identity } as UserIdentityMessage);
  }

  reset(): void {
    this.identity = null;
    clearIdentity();
    this.queueOrSend({ type: 'USER_IDENTITY', version: PROTOCOL_VERSION, payload: {} } as UserIdentityMessage);
  }

  track(name: string, properties: Record<string, string | number | boolean> = {}): void {
    this.queueOrSend({ type: 'CUSTOM_EVENT', version: PROTOCOL_VERSION, payload: { name, properties } } as CustomEventMessage);
  }

  getState(): Readonly<WidgetState> { return { ...this.state }; }
  destroy(): void { this.ui.destroy(); widgetInstance = null; }
}

let widgetInstance: VoxoraLoader | null = null;

function boot(): void {
  if (widgetInstance) return;
  widgetInstance = new VoxoraLoader();

  (window as any).Voxora = {
    open:     ()                            => widgetInstance?.open(),
    close:    ()                            => widgetInstance?.close(),
    toggle:   ()                            => widgetInstance?.toggle(),
    identify: (id: string, t?: object)     => widgetInstance?.identify(id, t as any),
    reset:    ()                            => widgetInstance?.reset(),
    track:    (n: string, p?: object)       => widgetInstance?.track(n, p as any),
    getState: ()                            => widgetInstance?.getState(),
    destroy: () => { widgetInstance?.destroy(); widgetInstance = null; delete (window as any).Voxora; },
  };
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
