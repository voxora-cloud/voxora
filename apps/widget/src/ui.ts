/**
 * Widget UI Manager
 * Handles button, iframe, and UI interactions
 */

import { WidgetConfig, WidgetState } from './types';

export class WidgetUI {
  private config: WidgetConfig;
  private state: WidgetState;
  private button: HTMLElement | null = null;
  private iframe: HTMLIFrameElement | null = null;
  private badge: HTMLElement | null = null;
  private onToggle?: (isOpen: boolean) => void;

  constructor(config: WidgetConfig, state: WidgetState) {
    this.config = config;
    this.state = state;
  }

  /**
   * Create and mount chat button
   */
  createButton(): HTMLElement {
    this.button = document.createElement('div');
    this.button.id = 'voxora-chat-button';
    this.button.setAttribute('role', 'button');
    this.button.setAttribute('aria-label', 'Open chat');
    
    const bgColor = this.config.primaryColor || '#667eea';
    
    this.button.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      </svg>
    `;

    Object.assign(this.button.style, {
      position: 'fixed',
      bottom: '24px',
      right: this.config.position === 'bottom-left' ? 'auto' : '24px',
      left: this.config.position === 'bottom-left' ? '24px' : 'auto',
      width: '60px',
      height: '60px',
      borderRadius: '50%',
      background: bgColor,
      boxShadow: '0 8px 24px rgba(102, 126, 234, 0.4)',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      zIndex: '2147483646', // Maximum safe z-index
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      transform: 'scale(0)',
      opacity: '0',
      border: 'none',
      outline: 'none'
    });

    // Hover effects
    this.button.addEventListener('mouseenter', () => {
      if (!this.state.isOpen && this.button) {
        this.button.style.transform = 'scale(1.1)';
        this.button.style.boxShadow = '0 12px 32px rgba(102, 126, 234, 0.5)';
      }
    });

    this.button.addEventListener('mouseleave', () => {
      if (!this.state.isOpen && this.button) {
        this.button.style.transform = 'scale(1)';
        this.button.style.boxShadow = '0 8px 24px rgba(102, 126, 234, 0.4)';
      }
    });

    this.button.addEventListener('click', () => this.toggle());

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

    return this.button;
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
    // Use sandbox for security - allow scripts, forms, and popups but NOT same-origin
    this.iframe.setAttribute('sandbox', 'allow-scripts allow-forms allow-popups');

    const isLeft = this.config.position === 'bottom-left';

    Object.assign(this.iframe.style, {
      position: 'fixed',
      bottom: '100px',
      right: isLeft ? 'auto' : '24px',
      left: isLeft ? '24px' : 'auto',
      width: '380px',
      height: '600px',
      maxWidth: 'calc(100vw - 48px)',
      maxHeight: 'calc(100vh - 140px)',
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
      display: 'none'
    });

    document.body.appendChild(this.iframe);
    this.setupResponsive();

    return this.iframe;
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
    if (!this.iframe || !this.button) return;

    this.state.isOpen = true;
    this.iframe.style.display = 'block';

    // Update button to close icon
    this.button.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    `;
    this.button.style.transform = 'scale(1) rotate(90deg)';
    this.button.setAttribute('aria-label', 'Close chat');

    // Animate widget in
    requestAnimationFrame(() => {
      if (this.iframe) {
        this.iframe.style.transform = 'scale(1) translateY(0)';
        this.iframe.style.opacity = '1';
      }
    });

    // Clear unread count
    this.setUnreadCount(0);

    if (this.onToggle) this.onToggle(true);
  }

  /**
   * Close widget
   */
  close(): void {
    if (!this.iframe || !this.button) return;

    this.state.isOpen = false;

    // Restore chat icon
    this.button.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      </svg>
    `;
    this.button.style.transform = 'scale(1) rotate(0deg)';
    this.button.setAttribute('aria-label', 'Open chat');

    // Animate widget out
    this.iframe.style.transform = 'scale(0.8) translateY(20px)';
    this.iframe.style.opacity = '0';

    setTimeout(() => {
      if (this.iframe) this.iframe.style.display = 'none';
    }, 300);

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
    const handleResize = () => {
      if (!this.iframe) return;

      const isLeft = this.config.position === 'bottom-left';

      if (window.innerWidth <= 480) {
        Object.assign(this.iframe.style, {
          width: 'calc(100vw - 24px)',
          height: 'calc(100vh - 120px)',
          right: isLeft ? 'auto' : '12px',
          left: isLeft ? '12px' : 'auto',
          bottom: '80px',
          borderRadius: '12px'
        });
      } else {
        Object.assign(this.iframe.style, {
          width: '380px',
          height: '600px',
          right: isLeft ? 'auto' : '24px',
          left: isLeft ? '24px' : 'auto',
          bottom: '100px',
          borderRadius: '16px'
        });
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();
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
    if (this.iframe) this.iframe.remove();
  }
}
