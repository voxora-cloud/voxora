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

import { parseWidgetConfig } from './config';
import { WidgetAPI } from './api';
import { WidgetUI } from './ui';
import { WidgetState, WidgetMessage } from './types';

class VoxoraWidget {
  private api: WidgetAPI | null = null;
  private ui: WidgetUI | null = null;
  private state: WidgetState;
  private allowedOrigins: string[] = [];

  constructor() {
    // Parse configuration from script tag
    const config = parseWidgetConfig();
    
    if (!config) {
      console.error('[VoxoraWidget] Failed to parse widget configuration. Widget will not load.');
      this.state = {
        isOpen: false,
        unreadCount: 0,
        token: null,
        conversationId: null
      };
      return;
    }
    
    // Initialize state
    this.state = {
      isOpen: false,
      unreadCount: 0,
      token: null,
      conversationId: null
    };

    // Initialize API and UI
    this.api = new WidgetAPI(config);
    this.ui = new WidgetUI(config, this.state);

    // Set allowed origins for postMessage security
    this.allowedOrigins = [
      config.apiUrl!,
      window.location.origin
    ];

    // Initialize widget
    this.init().catch(error => {
      console.error('[VoxoraWidget] Initialization failed:', error);
    });
  }

  /**
   * Get or create sessionId in parent window (persists across refreshes)
   */
  private getOrCreateSessionId(): string {
    const STORAGE_KEY = 'voxora_session_id';
    
    try {
      // Try localStorage first (works in parent window)
      let sessionId = localStorage.getItem(STORAGE_KEY);
      if (sessionId) {
        console.log('[VoxoraWidget] Using existing sessionId from localStorage');
        return sessionId;
      }

      // Generate new sessionId
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem(STORAGE_KEY, sessionId);
      console.log('[VoxoraWidget] Created new sessionId:', sessionId);
      return sessionId;
    } catch (error) {
      console.error('[VoxoraWidget] localStorage not available, using temporary sessionId');
      // Fallback to memory (won't persist)
      return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
  }

  /**
   * Initialize widget
   */
  private async init(): Promise<void> {
    try {
      console.log('[VoxoraWidget] Starting initialization...');
      
      if (!this.api || !this.ui) {
        throw new Error('Widget API or UI not initialized');
      }
      
      // Fetch widget configuration and authenticate in parallel
      const [widgetConfig] = await Promise.all([
        this.api.fetchConfig().catch(err => {
          console.warn('[VoxoraWidget] Config fetch failed:', err.message);
          return null;
        }),
        this.api.authenticate().catch(err => {
          console.error('[VoxoraWidget] Authentication failed:', err.message);
          throw err;
        })
      ]);

      const token = this.api.getToken();
      if (!token) {
        throw new Error('Failed to obtain authentication token');
      }

      this.state.token = token;

      // Get or create sessionId in parent window
      const sessionId = this.getOrCreateSessionId();

      // Create UI elements
      console.log('[VoxoraWidget] Creating UI...');
      this.ui.createButton();
      
      // Create iframe with authenticated URL and sessionId
      const iframeUrl = this.api.getWidgetUrl(token, sessionId, widgetConfig);
      this.ui.createIframe(iframeUrl);

      // Setup message handlers
      this.setupMessageHandlers();

      console.log('[VoxoraWidget] Initialized successfully');
    } catch (error) {
      console.error('[VoxoraWidget] Initialization error:', error);
      // Don't throw - fail gracefully
      this.showError('Widget failed to load. Please refresh the page.');
    }
  }

  /**
   * Show error message to user
   */
  private showError(message: string): void {
    console.error('[VoxoraWidget]', message);
    // Could show a small error indicator, but don't break the page
  }

  /**
   * Setup postMessage handlers for secure cross-origin communication
   */
  private setupMessageHandlers(): void {
    window.addEventListener('message', (event: MessageEvent) => {
      // Verify origin for security
      if (!this.isValidOrigin(event.origin)) {
        console.warn('[VoxoraWidget] Message from untrusted origin:', event.origin);
        return;
      }

      try {
        const message: WidgetMessage = event.data;
        
        if (!message || !message.type) return;

        switch (message.type) {
          case 'MINIMIZE_WIDGET':
            if (this.ui) this.ui.close();
            break;

          case 'NEW_MESSAGE':
            if (this.ui) this.ui.incrementUnread();
            break;

          case 'READY':
            console.log('[VoxoraWidget] Widget iframe ready');
            break;

          default:
            // Ignore unknown message types
            break;
        }
      } catch (error) {
        console.warn('[VoxoraWidget] Error handling message:', error);
      }
    });
  }

  /**
   * Validate message origin
   */
  private isValidOrigin(origin: string): boolean {
    // Allow 'null' origin for sandboxed iframes (they don't have same-origin access)
    if (origin === 'null') {
      return true;
    }
    
    // In production, be strict about origins
    return this.allowedOrigins.some(allowed => 
      origin === allowed || origin.startsWith(allowed)
    );
  }

  /**
   * Public API Methods
   */

  /**
   * Open the widget programmatically
   */
  public open(): void {
    if (this.ui) this.ui.open();
  }

  /**
   * Close the widget programmatically
   */
  public close(): void {
    if (this.ui) this.ui.close();
  }

  /**
   * Toggle widget open/close
   */
  public toggle(): void {
    if (this.ui) this.ui.toggle();
  }

  /**
   * Manually add unread count (for custom integrations)
   */
  public addUnread(count: number = 1): void {
    if (this.ui) this.ui.setUnreadCount(this.state.unreadCount + count);
  }

  /**
   * Get current widget state
   */
  public getState(): Readonly<WidgetState> {
    return { ...this.state };
  }

  /**
   * Destroy widget and cleanup
   */
  public destroy(): void {
    console.log('[VoxoraWidget] Destroying widget...');
    if (this.ui) {
      this.ui.destroy();  // ✅ Just cleanup
    }
    widgetInstance = null;
  }
}

// Global widget instance
let widgetInstance: VoxoraWidget | null = null;

/**
 * Initialize widget only once
 */
function initWidget(): void {
  // Log page load to detect reloads
  console.log('[VoxoraWidget] Page loaded at:', new Date().toISOString());
  console.log('[VoxoraWidget] Current URL:', window.location.href);
  
  if (widgetInstance !== null) {
    console.log('[VoxoraWidget] Widget already initialized, skipping.');
    return;
  }

  console.log('[VoxoraWidget] Initializing widget...');
  widgetInstance = new VoxoraWidget();

  // Expose global API
  (window as any).VoxoraWidget = {
    open: () => widgetInstance?.open(),
    close: () => widgetInstance?.close(),
    toggle: () => widgetInstance?.toggle(),
    addUnread: (count?: number) => widgetInstance?.addUnread(count),
    getState: () => widgetInstance?.getState(),
    destroy: () => {
      widgetInstance?.destroy();
      widgetInstance = null;
      (window as any).VoxoraWidget = undefined;
    }
  };
}

// Initialize when DOM is ready (only once)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initWidget, { once: true });
} else {
  initWidget();
}

// Detect page unload to debug reload issue
window.addEventListener('beforeunload', (event) => {
  console.log('[VoxoraWidget] Page is unloading/reloading!');
  console.trace('[VoxoraWidget] Stack trace of reload');
});

export { VoxoraWidget };
