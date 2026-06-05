/**
 * Widget UI Manager
 * Handles button, iframe, and UI interactions
 */

import { WidgetConfig, WidgetServerConfig, WidgetState } from './types';
import { INTERAONE_LOGO_SVG } from './shared/assets';

export class WidgetUI {
  private config: WidgetConfig;
  private state: WidgetState;
  private button: HTMLElement | null = null;
  private iframe: HTMLIFrameElement | null = null;
  private badge: HTMLElement | null = null;
  private dockContainer: HTMLElement | null = null;
  private outsideChipsContainer: HTMLElement | null = null;
  private onToggle?: (isOpen: boolean) => void;
  private customSize: { width: number; height: number } | null = null;
  private centered = false;
  private hostWidth: string | null = null;
  private hostHeight: string | null = null;
  private hostOverflowY: string | null = null;
  private hostOverflowX: string | null = null;
  private hostTransition: string | null = null;
  private documentOverflow: string | null = null;

  private get isFullscreen(): boolean {
    return this.config.fullscreen === true;
  }

  private isMobileSheet(): boolean {
    return !this.isFullscreen && window.innerWidth <= 768;
  }

  constructor(config: WidgetConfig, state: WidgetState) {
    this.config = config;
    this.state = state;
  }

  private getLauncherLabel(): string {
    return this.config.appearance?.launcherText?.trim() || 'Open chat';
  }

  private getLauncherTitle(): string {
    return this.config.appearance?.launcherText?.trim() || this.config.displayName || 'Open chat';
  }

  /**
   * Merge server-provided config fields into local config.
   */
  applyServerConfig(serverConfig: WidgetServerConfig | null): void {
    if (!serverConfig) return;

    const appearance = serverConfig.appearance || {};

    if (serverConfig.displayName) this.config.displayName = serverConfig.displayName;
    if (serverConfig.backgroundColor) this.config.backgroundColor = serverConfig.backgroundColor;
    if (appearance.primaryColor || serverConfig.primaryColor) {
      this.config.primaryColor = appearance.primaryColor || serverConfig.primaryColor;
    }
    if (appearance.position) this.config.position = appearance.position;

    this.config.appearance = appearance;
    this.config.behavior = serverConfig.behavior;
    this.config.ai = serverConfig.ai;
    this.config.conversation = serverConfig.conversation;
    this.config.features = serverConfig.features;
    this.config.suggestions = serverConfig.suggestions;
  }

  private shouldUseCustomIcon(): boolean {
    return false;
  }

  /**
   * Render the button content without interpolating user-controlled logo URLs
   * into raw HTML. Malformed URLs can otherwise leak text like `"/>` beside the
   * launcher when the browser repairs the broken markup.
   */
  private renderButtonIdleContent(): void {
    if (!this.button) return;

    this.button.textContent = '';
    this.button.innerHTML = INTERAONE_LOGO_SVG;
  }

  private setButtonClosedChrome(): void {
    if (!this.button) return;
    this.button.classList.remove('vx-open');
    Object.assign(this.button.style, {
      width: '60px',
      height: '60px',
      borderRadius: '50%',
      padding: '0',
    });
  }

  private setButtonOpenChrome(): void {
    if (!this.button) return;
    this.button.classList.add('vx-open');
    Object.assign(this.button.style, {
      width: '60px',
      height: '60px',
      borderRadius: '50%',
      padding: '0',
    });
  }
  private applyHostDockSpacing(width: number): void {
    if (this.isFullscreen) return;
    const body = document.body;
    if (!body) return;

    if (!this.state.isOpen) return;

    const effectiveWidth = this.isMobileSheet() ? 0 : width;

    if (this.hostWidth === null) {
      this.hostWidth = body.style.width || '';
      this.hostHeight = body.style.height || '';
      this.hostTransition = body.style.transition || '';
      this.hostOverflowY = body.style.overflowY || '';
      this.hostOverflowX = body.style.overflowX || '';
      this.documentOverflow = document.documentElement.style.overflow || '';
    }

    if (effectiveWidth > 0) {
      document.documentElement.style.overflow = 'hidden';
      body.style.width = `calc(100vw - ${effectiveWidth}px)`;
      body.style.height = '100dvh';
      body.style.overflowY = 'auto';
      body.style.overflowX = 'hidden';

      const baseTransition = this.hostTransition || '';
      const widthTransition = 'width 0.24s ease-in-out';
      body.style.transition = baseTransition
        ? `${baseTransition}, ${widthTransition}`
        : widthTransition;
      body.style.boxSizing = 'border-box';
    } else {
      // Mobile sheet mode
      document.documentElement.style.overflow = 'hidden';
      body.style.overflowY = 'hidden';
    }

    if (this.dockContainer) {
      this.dockContainer.style.right = '0px';
    }
  }

  private restoreHostDockSpacing(): void {
    const body = document.body;
    if (!body || this.hostWidth === null) return;
    
    body.style.width = this.hostWidth;
    body.style.height = this.hostHeight || '';
    
    if (this.hostTransition !== null) {
      body.style.transition = this.hostTransition;
    }
    if (this.hostOverflowY !== null) {
      body.style.overflowY = this.hostOverflowY;
    }
    if (this.hostOverflowX !== null) {
      body.style.overflowX = this.hostOverflowX;
    }
    if (this.documentOverflow !== null) {
      document.documentElement.style.overflow = this.documentOverflow;
    }
  }

  private getScrollbarWidth(): number {
    const doc = document.documentElement;
    if (!doc) return 0;
    return Math.max(0, window.innerWidth - doc.clientWidth);
  }

  private syncDockToScrollbar(): void {
    if (!this.dockContainer || this.isFullscreen || this.isMobileSheet()) return;
    this.dockContainer.style.right = '0px';
  }

  /**
   * Create and mount chat button
   */
  createButton(): HTMLElement {
    if (this.isFullscreen) {
      throw new Error('[InteraOneWidget] createButton() should not be called in fullscreen mode');
    }

    this.button = document.createElement('div');
    this.button.id = 'InteraOne-chat-button';
    this.button.setAttribute('role', 'button');
    this.button.setAttribute('aria-label', this.getLauncherLabel());
    this.button.setAttribute('title', this.getLauncherTitle());

    const bgColor = this.config.primaryColor || this.config.backgroundColor || '#845C6C';
    const buttonTextColor = this.config.appearance?.textColor || 'white';
    const shadowColor = bgColor.startsWith('#') ? `${bgColor}66` : 'rgba(132,92,108,0.4)';

    this.renderButtonIdleContent();

    Object.assign(this.button.style, {
      position: 'fixed',
      bottom: '24px',
      right: this.config.position === 'bottom-left' ? 'auto' : '24px',
      left: this.config.position === 'bottom-left' ? '24px' : 'auto',
      width: '60px',
      height: '60px',
      borderRadius: '50%',
      background: bgColor,
      boxShadow: `0 8px 24px ${shadowColor}`,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: buttonTextColor,
      zIndex: '2147483646', // Maximum safe z-index
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      transform: 'scale(0)',
      opacity: '0',
      border: 'none',
      outline: 'none',
      overflow: 'hidden',
      padding: '0',
      // Prevent text/element selection on double-click or drag over the button
      userSelect: 'none',
      WebkitUserSelect: 'none',
    });

    // Hover effects
    this.button.addEventListener('mouseenter', () => {
      if (!this.state.isOpen && this.button) {
        this.button.style.transform = 'scale(1.1)';
        this.button.style.boxShadow = `0 12px 32px ${shadowColor}`;
      }
    });

    this.button.addEventListener('mouseleave', () => {
      if (!this.state.isOpen && this.button) {
        this.button.style.transform = 'scale(1)';
        this.button.style.boxShadow = `0 8px 24px ${shadowColor}`;
      }
    });

    this.button.addEventListener('click', () => this.toggle());

    // Prevent the host page from getting a blue selection highlight when the
    // user double-clicks the button (selectstart fires before the browser
    // marks anything as selected, so cancelling it is zero-risk).
    this.button.addEventListener('mousedown', (e) => e.preventDefault());
    this.button.addEventListener('selectstart', (e) => e.preventDefault());

    // Create unread badge
    this.badge = document.createElement('div');
    Object.assign(this.badge.style, {
      position: 'absolute',
      top: '-4px',
      right: '-4px',
      minWidth: '20px',
      height: '20px',
      borderRadius: '10px',
      background: '#ff4757',
      display: 'none',
      border: '2px solid white',
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
      color: 'white',
      fontSize: '11px',
      fontWeight: 'bold',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '0 6px',
    });

    this.button.appendChild(this.badge);
    document.body.appendChild(this.button);

    // Animate in
    requestAnimationFrame(() => {
      if (this.button) {
        this.setButtonClosedChrome();
        this.button.style.transform = 'scale(1)';
        this.button.style.opacity = '1';
      }
    });
    this.renderOutsideChips();
    return this.button;
  }

  /**
   * Render floating chips above the launcher button for suggestions with showOutside=true.
   * Called after createButton(). Hidden when widget is open.
   */
  private renderOutsideChips(): void {
    const outside = (this.config.suggestions || []).filter((s) => s.showOutside && s.text);
    if (outside.length === 0) return;

    const isLeft = this.config.position === 'bottom-left';
    const accentColor = this.config.primaryColor || this.config.backgroundColor || '#10b981';

    this.outsideChipsContainer = document.createElement('div');
    this.outsideChipsContainer.id = 'InteraOne-outside-chips';
    Object.assign(this.outsideChipsContainer.style, {
      position: 'fixed',
      bottom: '100px',
      right: isLeft ? 'auto' : '16px',
      left: isLeft ? '16px' : 'auto',
      display: 'flex',
      flexDirection: 'column',
      alignItems: isLeft ? 'flex-start' : 'flex-end',
      gap: '8px',
      zIndex: '2147483644',
    });

    outside.forEach((s) => {
      const chip = document.createElement('button');
      chip.innerHTML = `
        <span style="display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:999px;background:rgba(16,185,129,0.14);color:${accentColor};flex-shrink:0;transition:all 0.2s ease;">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </span>
        <span style="white-space:normal;word-break:break-word;">${s.text}</span>
      `;
      Object.assign(chip.style, {
        background: 'linear-gradient(180deg, rgba(255,255,255,0.96), rgba(248,250,252,0.9))',
        color: '#0f172a',
        border: '1px solid rgba(255,255,255,0.7)',
        borderRadius: '999px',
        padding: '8px 14px',
        fontSize: '13px',
        fontWeight: '600',
        cursor: 'pointer',
        boxShadow: '0 10px 24px rgba(2, 6, 23, 0.2), 0 0 0 1px rgba(15, 23, 42, 0.06)',
        whiteSpace: 'normal',
        maxWidth: '300px',
        overflow: 'visible',
        transition: 'all 0.22s cubic-bezier(0.22, 1, 0.36, 1)',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, sans-serif',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        backdropFilter: 'blur(8px)',
        wordBreak: 'break-word',
      });
      chip.addEventListener('mouseenter', () => {
        chip.style.background = `linear-gradient(180deg, ${accentColor}, ${accentColor})`;
        chip.style.color = '#ffffff';
        chip.style.transform = 'translateY(-2px) scale(1.01)';
        chip.style.boxShadow = '0 14px 28px rgba(2, 6, 23, 0.28), 0 0 0 1px rgba(255,255,255,0.15)';
        const iconBubble = chip.firstElementChild as HTMLElement | null;
        if (iconBubble) {
          iconBubble.style.background = 'rgba(255,255,255,0.18)';
          iconBubble.style.color = '#ffffff';
        }
      });
      chip.addEventListener('mouseleave', () => {
        chip.style.background = 'linear-gradient(180deg, rgba(255,255,255,0.96), rgba(248,250,252,0.9))';
        chip.style.color = '#0f172a';
        chip.style.transform = 'translateY(0) scale(1)';
        chip.style.boxShadow = '0 10px 24px rgba(2, 6, 23, 0.2), 0 0 0 1px rgba(15, 23, 42, 0.06)';
        const iconBubble = chip.firstElementChild as HTMLElement | null;
        if (iconBubble) {
          iconBubble.style.background = 'rgba(16,185,129,0.14)';
          iconBubble.style.color = accentColor;
        }
      });
      chip.addEventListener('click', () => {
        // Open the widget, then send the suggestion via postMessage to iframe
        if (!this.state.isOpen) {
          this.open();
          // Give iframe time to be ready, then send text
          setTimeout(() => this._sendSuggestionToIframe(s.text), 600);
        } else {
          this._sendSuggestionToIframe(s.text);
        }
      });
      this.outsideChipsContainer!.appendChild(chip);
    });

    document.body.appendChild(this.outsideChipsContainer);
  }

  /** Post the suggestion text to the iframe so it fills + sends the message. */
  private _sendSuggestionToIframe(text: string): void {
    if (this.iframe?.contentWindow) {
      this.iframe.contentWindow.postMessage(
        { type: 'SUGGESTION_CLICK', version: '1', payload: { text } },
        '*',
      );
    }
  }

  /**
   * Create iframe widget
   */
  createIframe(src: string): HTMLIFrameElement {
    this.iframe = document.createElement('iframe');
    this.iframe.id = 'InteraOne-widget-iframe';
    this.iframe.src = src;
    this.iframe.allow = 'microphone; camera';
    this.iframe.setAttribute('title', 'InteraOne Chat Widget');
    // Use sandbox for security - allow scripts, forms, popups, and same-origin (for localStorage)
    this.iframe.setAttribute('sandbox', 'allow-scripts allow-forms allow-popups allow-same-origin');

    if (this.isFullscreen) {
      Object.assign(this.iframe.style, {
        position: 'fixed',
        top: '0',
        right: '0',
        bottom: '0',
        left: '0',
        width: '100vw',
        height: '100dvh',
        maxWidth: '100vw',
        maxHeight: '100dvh',
        border: 'none',
        borderRadius: '0',
        boxShadow: 'none',
        overflow: 'hidden',
        zIndex: '2147483647',
        background: 'white',
        transition: 'opacity 0.2s ease',
        transform: 'none',
        opacity: '0',
        transformOrigin: 'center center',
        display: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      });
    } else {
      this.dockContainer = document.createElement('div');
      this.dockContainer.id = 'InteraOne-widget-dock';
      Object.assign(this.dockContainer.style, {
        position: 'fixed',
        top: '0',
        right: '0px',
        bottom: '0',
        width: `${this.getPanelWidth()}px`,
        height: '100dvh',
        zIndex: '2147483645',
        transform: 'translateX(100%)',
        opacity: '0',
        transition: 'transform 0.24s ease-in-out, opacity 0.24s ease',
        pointerEvents: 'none',
        borderLeft: '1px solid rgba(15, 23, 42, 0.14)',
        background: 'transparent',
      });

      Object.assign(this.iframe.style, {
        position: 'relative',
        width: '100%',
        height: '100%',
        border: 'none',
        borderRadius: '0',
        boxShadow: 'none',
        overflow: 'hidden',
        background: 'transparent',
        display: 'block',
        // Prevent the host page from getting a selection highlight when the
        // user double-clicks inside the iframe area.
        userSelect: 'none',
        WebkitUserSelect: 'none',
      });
    }

    if (this.dockContainer) {
      this.dockContainer.appendChild(this.iframe);
      document.body.appendChild(this.dockContainer);
    } else {
      document.body.appendChild(this.iframe);
    }
    this.setupResponsive();

    return this.iframe;
  }

  /**
   * Apply an explicit iframe size requested by the child widget UI.
   */
  resizeFromIframe(width: number, height: number, centered = false): void {
    if (!this.iframe) return;
    if (!Number.isFinite(width) || !Number.isFinite(height)) return;

    this.customSize = {
      width: Math.max(360, Math.round(width)),
      height: Math.max(420, Math.round(height)),
    };
    this.centered = centered;
    this.applyResponsiveLayout();
    if (this.state.isOpen) this.applyHostDockSpacing(this.getPanelWidth());
  }

  /**
   * Toggle widget open/close
   */
  toggle(): void {
    if (this.state.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  /**
   * Open widget
   */
  open(): void {
    if (!this.iframe) return;

    this.state.isOpen = true;
    if (this.dockContainer) this.dockContainer.style.pointerEvents = 'auto';

    if (this.button) {
      this.setButtonOpenChrome();
      this.button.style.transform = 'scale(1)';
      this.button.setAttribute('aria-label', 'Close chat');
      this.button.setAttribute('title', 'Close chat');
      this.button.style.display = 'none';
    }

    // Animate widget in
    requestAnimationFrame(() => {
      if (this.isFullscreen && this.iframe) {
        this.iframe.style.display = 'block';
        this.iframe.style.opacity = '1';
        return;
      }

      if (this.dockContainer) {
        this.dockContainer.style.transform = 'translateX(0)';
        this.dockContainer.style.opacity = '1';
      }
    });

    this.applyHostDockSpacing(this.getPanelWidth());

    // Hide outside chips while widget is open
    if (this.outsideChipsContainer) this.outsideChipsContainer.style.display = 'none';

    if (this.onToggle) this.onToggle(true);
  }

  /**
   * Close widget
   */
  close(): void {
    if (!this.iframe) return;

    this.state.isOpen = false;

    if (this.button) {
      this.setButtonClosedChrome();
      this.button.style.transform = 'scale(1)';
      this.button.setAttribute('aria-label', this.getLauncherLabel());
      this.button.setAttribute('title', this.getLauncherTitle());
      this.button.style.display = 'flex';
    }

    // Animate widget out
    if (this.isFullscreen) {
      this.iframe.style.opacity = '0';
      setTimeout(() => {
        if (this.iframe) this.iframe.style.display = 'none';
      }, 200);
    } else if (this.dockContainer) {
      this.dockContainer.style.transform = 'translateX(100%)';
      this.dockContainer.style.opacity = '0';
      this.dockContainer.style.pointerEvents = 'none';
    }

    this.restoreHostDockSpacing();

    // Restore outside chips
    if (this.outsideChipsContainer) this.outsideChipsContainer.style.display = 'flex';

    if (this.onToggle) this.onToggle(false);
  }

  /**
   * Setup responsive behavior
   */
  private setupResponsive(): void {
    window.addEventListener('resize', () => this.applyResponsiveLayout());
    this.applyResponsiveLayout();
  }

  private applyResponsiveLayout(): void {
    if (!this.iframe) return;

    if (this.isFullscreen) {
      Object.assign(this.iframe.style, {
        top: '0',
        right: '0',
        bottom: '0',
        left: '0',
        width: '100vw',
        height: '100dvh',
        maxWidth: '100vw',
        maxHeight: '100dvh',
        borderRadius: '0',
        boxShadow: 'none',
      });
      this.iframe.style.transformOrigin = 'center center';
      return;
    }

    if (this.isMobileSheet()) {
      if (this.dockContainer) {
        Object.assign(this.dockContainer.style, {
          width: '100vw',
          height: '100dvh',
          right: '0',
          left: '0',
          top: '0',
          bottom: '0',
          borderLeft: 'none',
        });
        this.dockContainer.style.transformOrigin = 'right center';
        this.dockContainer.style.transform = this.state.isOpen ? 'translateX(0)' : 'translateX(100%)';
      }
      if (this.state.isOpen) this.applyHostDockSpacing(this.getPanelWidth());
      return;
    }

    const panelWidth = this.getPanelWidth();
    if (this.dockContainer) {
      Object.assign(this.dockContainer.style, {
        width: `${panelWidth}px`,
        height: '100dvh',
        right: '0px',
        left: 'auto',
        top: '0',
        bottom: '0',
        borderLeft: '1px solid rgba(15, 23, 42, 0.14)',
      });
      this.dockContainer.style.transformOrigin = 'right center';
      this.dockContainer.style.transform = this.state.isOpen ? 'translateX(0)' : 'translateX(100%)';
    }
    if (this.state.isOpen) this.applyHostDockSpacing(this.getPanelWidth());
  }

  private getPanelWidth(): number {
    const fallback = this.customSize?.width ?? 420;
    return Math.min(480, Math.max(360, Math.round(fallback)));
  }

  /**
   * Set toggle callback
   */
  onToggleChange(callback: (isOpen: boolean) => void): void {
    this.onToggle = callback;
  }

  /**
   * Get iframe element
   */
  getIframe(): HTMLIFrameElement | null {
    return this.iframe;
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.button) this.button.remove();
    if (this.outsideChipsContainer) this.outsideChipsContainer.remove();
    if (this.iframe) this.iframe.remove();
    if (this.dockContainer) this.dockContainer.remove();
    this.restoreHostDockSpacing();
  }
}
