/**
 * Widget UI Manager
 * Handles button, iframe, and UI interactions
 */

import { WidgetConfig, WidgetServerConfig, WidgetState } from './types';

const DEFAULT_FLOATING_ICON_URL = 'https://i.postimg.cc/MGnnrRZg/Untitled-design-3-removebg-preview.png';

export class WidgetUI {
  private config: WidgetConfig;
  private state: WidgetState;
  private button: HTMLElement | null = null;
  private iframe: HTMLIFrameElement | null = null;
  private badge: HTMLElement | null = null;
  private outsideChipsContainer: HTMLElement | null = null;
  private onToggle?: (isOpen: boolean) => void;
  private customSize: { width: number; height: number } | null = null;
  private centered = false;

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

  /**
   * Merge server-provided config fields (e.g. logoUrl, displayName) into local config.
   * Must be called before createButton() so the button picks up the logo.
   */
  applyServerConfig(serverConfig: WidgetServerConfig | null): void {
    if (!serverConfig) return;

    const appearance = serverConfig.appearance || {};

    if (serverConfig.logoUrl || appearance.logoUrl) {
      this.config.logoUrl = appearance.logoUrl || serverConfig.logoUrl;
    }
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

  /**
   * Returns the button innerHTML for the idle (closed) state.
   * Shows the brand logo if available, otherwise falls back to the chat SVG.
   */
  private buttonIdleContent(): string {
    // Use configured logo first; otherwise fall back to the default brand icon URL.
    const iconUrl = this.config.logoUrl || DEFAULT_FLOATING_ICON_URL;
    if (iconUrl) {
      return `<img
        src="${iconUrl}"
        data-default-icon="${DEFAULT_FLOATING_ICON_URL}"
        alt="logo"
        style="width:34px;height:34px;object-fit:contain;border-radius:6px;display:block;"
        onerror="if(this.dataset.vxRetriedDefault!=='1'){this.dataset.vxRetriedDefault='1';var d=this.getAttribute('data-default-icon');if(d&&this.src!==d){this.src=d;return;}}this.replaceWith((function(){var s=document.createElementNS('http://www.w3.org/2000/svg','svg');s.setAttribute('width','24');s.setAttribute('height','24');s.setAttribute('viewBox','0 0 24 24');s.setAttribute('fill','none');s.setAttribute('stroke','currentColor');s.setAttribute('stroke-width','1.9');s.setAttribute('stroke-linecap','round');s.setAttribute('stroke-linejoin','round');var p=document.createElementNS('http://www.w3.org/2000/svg','path');p.setAttribute('d','M12 3c-4.97 0-9 3.58-9 8 0 2.42 1.2 4.58 3.1 6.05V21l3.45-2.18c.78.24 1.6.36 2.45.36 4.97 0 9-3.58 9-8s-4.03-8-9-8z');var c1=document.createElementNS('http://www.w3.org/2000/svg','circle');c1.setAttribute('cx','9');c1.setAttribute('cy','11.5');c1.setAttribute('r','1');var c2=document.createElementNS('http://www.w3.org/2000/svg','circle');c2.setAttribute('cx','12');c2.setAttribute('cy','11.5');c2.setAttribute('r','1');var c3=document.createElementNS('http://www.w3.org/2000/svg','circle');c3.setAttribute('cx','15');c3.setAttribute('cy','11.5');c3.setAttribute('r','1');s.appendChild(p);s.appendChild(c1);s.appendChild(c2);s.appendChild(c3);return s;})())"
      />`;
    }

    return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 3c-4.97 0-9 3.58-9 8 0 2.42 1.2 4.58 3.1 6.05V21l3.45-2.18c.78.24 1.6.36 2.45.36 4.97 0 9-3.58 9-8s-4.03-8-9-8z"></path>
      <circle cx="9" cy="11.5" r="1"></circle>
      <circle cx="12" cy="11.5" r="1"></circle>
      <circle cx="15" cy="11.5" r="1"></circle>
    </svg>`;
  }

  /**
   * Create and mount chat button
   */
  createButton(): HTMLElement {
    if (this.isFullscreen) {
      throw new Error('[VoxoraWidget] createButton() should not be called in fullscreen mode');
    }

    this.button = document.createElement('div');
    this.button.id = 'voxora-chat-button';
    this.button.setAttribute('role', 'button');
    const launcherText = this.config.appearance?.launcherText?.trim();
    this.button.setAttribute('aria-label', launcherText || 'Open chat');
    this.button.setAttribute('title', launcherText || this.config.displayName || 'Open chat');
    
    const bgColor = this.config.primaryColor || this.config.backgroundColor || '#667eea';
    const buttonTextColor = this.config.appearance?.textColor || 'white';
    // Derive shadow colour from the background for a cohesive look
    const shadowColor = bgColor.startsWith('#') ? `${bgColor}66` : 'rgba(102,126,234,0.4)';
    
    this.button.innerHTML = this.buttonIdleContent();

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
      padding: '0 6px'
    });
    
    this.button.appendChild(this.badge);

    document.body.appendChild(this.button);

    // Animate in
    requestAnimationFrame(() => {
      if (this.button) {
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
    this.outsideChipsContainer.id = 'voxora-outside-chips';
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
            <path d="M12 3l1.9 4.8L19 9.7l-4 3.1 1.4 5L12 15.2 7.6 17.8 9 12.8 5 9.7l5.1-1.9L12 3z"></path>
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
    this.iframe.id = 'voxora-widget-iframe';
    this.iframe.src = src;
    this.iframe.allow = 'microphone; camera';
    this.iframe.setAttribute('title', 'Voxora Chat Widget');
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
        height: '100vh',
        maxWidth: '100vw',
        maxHeight: '100vh',
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
      const isLeft = this.config.position === 'bottom-left';

      Object.assign(this.iframe.style, {
        position: 'fixed',
        bottom: '100px',
        right: isLeft ? 'auto' : '24px',
        left: isLeft ? '24px' : 'auto',
        width: '380px',
        height: '700px',
        maxWidth: 'calc(100vw - 48px)',
        maxHeight: 'calc(100vh - 120px)',
        border: 'none',
        borderRadius: '16px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(0, 0, 0, 0.05)',
        overflow: 'hidden',
        zIndex: '2147483645', // One below button
        background: 'white',
        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        transform: 'scale(0.8) translateY(20px)',
        opacity: '0',
        transformOrigin: isLeft ? 'bottom left' : 'bottom right',
        display: 'none',
        // Prevent the host page from getting a selection highlight when the
        // user double-clicks inside the iframe area.
        userSelect: 'none',
        WebkitUserSelect: 'none',
      });
    }

    document.body.appendChild(this.iframe);
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
      width: Math.max(320, Math.round(width)),
      height: Math.max(420, Math.round(height)),
    };
    this.centered = centered;
    this.applyResponsiveLayout();
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
    this.iframe.style.display = 'block';

    if (this.button) {
      // Update button to close icon
      this.button.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      `;
      this.button.style.transform = 'scale(1) rotate(90deg)';
      this.button.setAttribute('aria-label', 'Close chat');
      this.button.setAttribute('title', 'Close chat');
    }

    // Animate widget in
    requestAnimationFrame(() => {
      if (this.iframe) {
        if (this.isMobileSheet()) {
          this.iframe.style.transform = 'translateY(0)';
        } else if (!this.isFullscreen) {
          this.iframe.style.transform = 'scale(1) translateY(0)';
        }
        this.iframe.style.opacity = '1';
      }
    });

    // Clear unread count
    this.setUnreadCount(0);

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
      // Restore logo / chat icon
      this.button.innerHTML = this.buttonIdleContent();
      this.button.style.transform = 'scale(1) rotate(0deg)';
      const launcherText = this.config.appearance?.launcherText?.trim();
      this.button.setAttribute('aria-label', launcherText || 'Open chat');
      this.button.setAttribute('title', launcherText || this.config.displayName || 'Open chat');
    }

    // Animate widget out
    if (this.isMobileSheet()) {
      this.iframe.style.transform = 'translateY(110%)';
    } else if (!this.isFullscreen) {
      this.iframe.style.transform = 'scale(0.8) translateY(20px)';
    }
    this.iframe.style.opacity = '0';

    setTimeout(() => {
      if (this.iframe) this.iframe.style.display = 'none';
    }, 300);

    // Restore outside chips
    if (this.outsideChipsContainer) this.outsideChipsContainer.style.display = 'flex';

    if (this.onToggle) this.onToggle(false);
  }

  /**
   * Update unread count
   */
  setUnreadCount(count: number): void {
    this.state.unreadCount = count;

    if (!this.badge) return;

    if (count > 0) {
      this.badge.textContent = count > 99 ? '99+' : count.toString();
      this.badge.style.display = 'flex';
    } else {
      this.badge.style.display = 'none';
    }
  }

  /**
   * Increment unread count
   */
  incrementUnread(): void {
    if (!this.state.isOpen) {
      this.setUnreadCount(this.state.unreadCount + 1);
    }
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
        height: '100vh',
        maxWidth: '100vw',
        maxHeight: '100vh',
        borderRadius: '0',
        boxShadow: 'none',
      });
      this.iframe.style.transformOrigin = 'center center';
      return;
    }

    const isLeft = this.config.position === 'bottom-left';

    if (this.isMobileSheet()) {
      this.centered = false;
      Object.assign(this.iframe.style, {
        width: '100vw',
        height: '90vh',
        maxWidth: '100vw',
        maxHeight: '90vh',
        right: '0',
        left: '0',
        bottom: '0',
        top: 'auto',
        borderRadius: '18px 18px 0 0',
        boxShadow: '0 -16px 48px rgba(0, 0, 0, 0.28)',
        transition: 'transform 0.32s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.2s ease',
      });
      this.iframe.style.transformOrigin = 'bottom center';
      this.iframe.style.transform = this.state.isOpen ? 'translateY(0)' : 'translateY(110%)';
      return;
    }

    if (this.customSize) {
      const maxWidth = Math.max(320, window.innerWidth - 48);
      const maxHeight = Math.max(420, window.innerHeight - 80);
      const width = Math.min(this.customSize.width, maxWidth);
      const height = Math.min(this.customSize.height, maxHeight);
      const centeredLeft = `${Math.max(24, Math.round((window.innerWidth - width) / 2))}px`;
      const centeredTop = `${Math.max(24, Math.round((window.innerHeight - height) / 2))}px`;

      Object.assign(this.iframe.style, {
        width: `${width}px`,
        height: `${height}px`,
        maxWidth: 'calc(100vw - 48px)',
        maxHeight: 'calc(100vh - 80px)',
        right: this.centered ? 'auto' : (isLeft ? 'auto' : '24px'),
        left: this.centered ? centeredLeft : (isLeft ? '24px' : 'auto'),
        top: this.centered ? centeredTop : 'auto',
        bottom: this.centered ? 'auto' : '100px',
        borderRadius: '16px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(0, 0, 0, 0.05)',
        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      });
      this.iframe.style.transformOrigin = this.centered ? 'center center' : (isLeft ? 'bottom left' : 'bottom right');
      this.iframe.style.transform = this.state.isOpen ? 'scale(1) translateY(0)' : 'scale(0.8) translateY(20px)';
      return;
    }

    Object.assign(this.iframe.style, {
      width: '380px',
      height: '700px',
      maxWidth: 'calc(100vw - 48px)',
      maxHeight: 'calc(100vh - 120px)',
      right: isLeft ? 'auto' : '24px',
      left: isLeft ? '24px' : 'auto',
      top: 'auto',
      bottom: '100px',
      borderRadius: '16px',
      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(0, 0, 0, 0.05)',
      transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
    });
    this.iframe.style.transformOrigin = isLeft ? 'bottom left' : 'bottom right';
    this.iframe.style.transform = this.state.isOpen ? 'scale(1) translateY(0)' : 'scale(0.8) translateY(20px)';
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
  }
}
