/**
 * Widget UI Manager
 * Handles button, iframe, and UI interactions
 */

import { WidgetConfig, WidgetServerConfig, WidgetState } from './types';

const DOCK_TRANSITION = 'width 0.34s cubic-bezier(0.22, 1, 0.36, 1), height 0.34s cubic-bezier(0.22, 1, 0.36, 1), border-radius 0.34s cubic-bezier(0.22, 1, 0.36, 1), transform 0.34s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.18s ease';

export class WidgetUI {
  private config: WidgetConfig;
  private state: WidgetState;
  private button: HTMLElement | null = null;
  private launcherInput: HTMLInputElement | null = null;
  private launcherPlaceholderEl: HTMLElement | null = null;
  private iframe: HTMLIFrameElement | null = null;

  private dockContainer: HTMLElement | null = null;
  private outsideChipsContainer: HTMLElement | null = null;
  private launcherPlaceholderTimer: number | null = null;
  private openSoundContext: AudioContext | null = null;
  private onToggle?: (isOpen: boolean) => void;
  private customSize: { width: number; height: number } | null = null;
  private activePanelWidth: number | null = null;
  private hostWidth: string | null = null;
  private hostHeight: string | null = null;
  private hostOverflowY: string | null = null;
  private hostOverflowX: string | null = null;
  private hostTransition: string | null = null;
  private documentOverflow: string | null = null;
  private hostMinHeight: string | null = null;
  private pageVisible = true;
  private resizeHandler: (() => void) | null = null;
  private scrollHandler: (() => void) | null = null;
  private scrollEndTimer: number | null = null;
  private mobileCloseTimer: number | null = null;
  private outsideChipsRevealFrame: number | null = null;
  private outsideChipsVisible = false;
  private isPageScrolling = false;
  private outsideClickHandler: ((event: MouseEvent) => void) | null = null;
  private hasStartedChat = false;
  private ignoreOutsideClicksUntil = 0;

  private ensureHostFonts(): void {
    if (document.getElementById('InteraOne-fonts')) return;

    const fontStylesheet = document.createElement('link');
    fontStylesheet.id = 'InteraOne-fonts';
    fontStylesheet.rel = 'stylesheet';
    fontStylesheet.href =
      'https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600&display=swap';
    document.head.appendChild(fontStylesheet);
  }

  private ensureHostLauncherStyles(): void {
    if (document.getElementById('InteraOne-launcher-styles')) return;

    const style = document.createElement('style');
    style.id = 'InteraOne-launcher-styles';
    style.textContent = `
      #InteraOne-chat-button .InteraOne-launcher-placeholder {
        background-size: 220% 100%;
        filter: drop-shadow(0 8px 18px rgba(123, 143, 179, 0.16));
        will-change: transform, background-position, filter;
      }

      #InteraOne-chat-button .InteraOne-launcher-placeholder.is-typing {
        animation: InteraOneTextWriteSweep 0.95s ease-in-out infinite;
        filter: drop-shadow(0 9px 18px rgba(123, 143, 179, 0.2));
      }

      #InteraOne-chat-button .InteraOne-launcher-placeholder.is-holding {
        animation: InteraOneTextHoldStep 0.32s ease-out both;
        filter: drop-shadow(0 10px 22px rgba(199, 135, 104, 0.22));
      }

      #InteraOne-chat-button .InteraOne-launcher-placeholder.is-erasing {
        animation: InteraOneTextEraseStep 0.42s ease-in-out infinite alternate;
        filter: drop-shadow(0 6px 14px rgba(123, 143, 179, 0.12));
      }

      @keyframes InteraOneTextWriteSweep {
        0% {
          background-position: 0% 50%;
        }
        100% {
          background-position: 100% 50%;
        }
      }

      @keyframes InteraOneTextHoldStep {
        0% {
          transform: translateY(-50%) scale(0.985);
        }
        100% {
          transform: translateY(-50%) scale(1);
        }
      }

      @keyframes InteraOneTextEraseStep {
        0% {
          background-position: 100% 50%;
        }
        100% {
          background-position: 40% 50%;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        #InteraOne-chat-button .InteraOne-launcher-placeholder {
          animation: none !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  private isMobileSheet(): boolean {
    return window.innerWidth <= 768;
  }

  private playOpenSound(): void {
    try {
      const AudioContextConstructor =
        window.AudioContext ||
        (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextConstructor) return;

      const audioContext = this.openSoundContext ?? new AudioContextConstructor();
      this.openSoundContext = audioContext;

      const playTone = () => {
        const now = audioContext.currentTime;
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(520, now);
        oscillator.frequency.exponentialRampToValueAtTime(700, now + 0.14);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.055, now + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);

        oscillator.connect(gain).connect(audioContext.destination);
        oscillator.start(now);
        oscillator.stop(now + 0.21);
      };

      if (audioContext.state === 'suspended') {
        void audioContext.resume().then(playTone).catch(() => undefined);
      } else {
        playTone();
      }
    } catch {
      // Audio may be unavailable or blocked by the host browser.
    }
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

  private getFloatingInputPlaceholder(): string {
    return 'Need help? Ask here and we’ll point you in the right direction.';
  }

  private startLauncherPlaceholderTypewriter(): void {
    if (!this.launcherInput || !this.launcherPlaceholderEl) return;
    if (this.launcherPlaceholderTimer !== null) {
      window.clearInterval(this.launcherPlaceholderTimer);
      this.launcherPlaceholderTimer = null;
    }

    const fullText = this.getFloatingInputPlaceholder();
    let index = 0;
    let pauseTicks = 0;
    let isErasing = false;
    let motionState: 'typing' | 'holding' | 'erasing' | 'resting' = 'typing';

    const applyMotionState = (nextState: typeof motionState) => {
      if (!this.launcherPlaceholderEl || motionState === nextState) return;
      motionState = nextState;
      this.launcherPlaceholderEl.className = `InteraOne-launcher-placeholder is-${nextState}`;
    };

    const tick = () => {
      if (!this.launcherInput || !this.launcherPlaceholderEl) return;

      if (this.launcherInput.value) {
        this.launcherPlaceholderEl.textContent = '';
        this.launcherPlaceholderEl.style.opacity = '0';
        applyMotionState('resting');
        return;
      }

      this.launcherPlaceholderEl.style.opacity = document.activeElement === this.launcherInput ? '0' : '1';

      if (pauseTicks > 0) {
        pauseTicks -= 1;
        return;
      }

      applyMotionState(isErasing ? 'erasing' : 'typing');
      index += isErasing ? -1 : 1;
      this.launcherPlaceholderEl.textContent = fullText.slice(0, index);

      if (!isErasing && index >= fullText.length) {
        isErasing = true;
        applyMotionState('holding');
        pauseTicks = 3;
        return;
      }

      if (isErasing && index <= 0) {
        isErasing = false;
        applyMotionState('resting');
        pauseTicks = 1;
      }
    };

    this.launcherInput.placeholder = '';
    this.launcherPlaceholderEl.textContent = '';
    this.launcherPlaceholderEl.className = 'InteraOne-launcher-placeholder is-typing';
    this.launcherPlaceholderTimer = window.setInterval(tick, 24);
  }

  /**
   * Merge server-provided config fields into local config.
   */
  applyServerConfig(serverConfig: WidgetServerConfig | null): void {
    if (!serverConfig) return;

    const appearance = serverConfig.appearance || {};

    if (serverConfig.displayName) this.config.displayName = serverConfig.displayName;
    // Color fields removed; rely on theme defaults
    if (appearance.position) this.config.position = appearance.position;

    this.config.appearance = appearance;
    this.config.behavior = serverConfig.behavior;
    this.config.ai = serverConfig.ai;
    this.config.conversation = serverConfig.conversation;
    this.config.features = serverConfig.features;
    this.config.suggestions = serverConfig.suggestions;

    if (this.launcherInput) {
      this.startLauncherPlaceholderTypewriter();
    }
  }


  /**
   * Render the button content without interpolating user-controlled logo URLs
   * into raw HTML. Malformed URLs can otherwise leak text like `"/>` beside the
   * launcher when the browser repairs the broken markup.
   */
  private renderButtonIdleContent(): void {
    if (!this.button) return;

    this.button.textContent = '';
    this.launcherPlaceholderEl = document.createElement('span');
    this.launcherPlaceholderEl.setAttribute('aria-hidden', 'true');
    Object.assign(this.launcherPlaceholderEl.style, {
      position: 'absolute',
      left: '14px',
      right: '54px',
      top: '50%',
      transform: 'translateY(-50%)',
      pointerEvents: 'none',
      overflow: 'hidden',
      whiteSpace: 'nowrap',
      textOverflow: 'clip',
      color: 'transparent',
      background: 'linear-gradient(90deg, #1f2933 0%, #7b8fb3 48%, #c78768 100%)',
      WebkitBackgroundClip: 'text',
      backgroundClip: 'text',
      font: '700 15px/1.2 "Hanken Grotesk", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      letterSpacing: '0',
      opacity: '1',
      transition: 'opacity 0.16s ease',
    });

    this.launcherInput = document.createElement('input');
    this.launcherInput.type = 'text';
    this.launcherInput.placeholder = '';
    this.launcherInput.setAttribute('aria-label', 'Ask about your recordings');
    Object.assign(this.launcherInput.style, {
      flex: '1 1 auto',
      minWidth: '0',
      height: '100%',
      border: '0',
      outline: '0',
      background: 'transparent',
      color: '#1f2933',
      font: '600 15px/1.2 "Hanken Grotesk", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      letterSpacing: '0',
      padding: '0 8px 0 14px',
      textAlign: 'left',
      textOverflow: 'ellipsis',
      position: 'relative',
      zIndex: '1',
    });

    const sendButton = document.createElement('button');
    sendButton.type = 'button';
    sendButton.setAttribute('aria-label', 'Open chat');
    sendButton.innerHTML = `
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M12 19V5"></path>
        <path d="M5 12l7-7 7 7"></path>
      </svg>
    `;
    Object.assign(sendButton.style, {
      width: '34px',
      height: '34px',
      borderRadius: '50%',
      border: '0',
      flex: '0 0 34px',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#ffffff',
      cursor: 'pointer',
      background: 'linear-gradient(135deg, #e4a17f 0%, #9fb8d9 58%, #8397bf 100%)',
      boxShadow: '0 10px 22px rgba(91, 112, 143, 0.24)',
      padding: '0',
      transition: 'transform 0.18s ease, box-shadow 0.18s ease, filter 0.18s ease',
    });

    sendButton.addEventListener('mouseenter', () => {
      sendButton.style.transform = 'translateY(-1px)';
      sendButton.style.filter = 'brightness(1.03)';
    });
    sendButton.addEventListener('mouseleave', () => {
      sendButton.style.transform = 'translateY(0)';
      sendButton.style.filter = 'brightness(1)';
    });
    sendButton.addEventListener('click', (event) => {
      event.stopPropagation();
      this.submitLauncherPrompt();
    });
    sendButton.addEventListener('mousedown', (event) => event.stopPropagation());

    this.launcherInput.addEventListener('click', (event) => {
      event.stopPropagation();
      if (this.hasStartedChat) {
        this.handleLauncherInputOpen();
      } else {
        this.showOutsideChips();
      }
    });
    this.launcherInput.addEventListener('focus', () => {
      this.showOutsideChips();
      if (this.launcherPlaceholderEl) this.launcherPlaceholderEl.style.opacity = '0';
    });
    this.launcherInput.addEventListener('blur', () => {
      if (this.launcherPlaceholderEl && !this.launcherInput?.value) {
        this.launcherPlaceholderEl.style.opacity = '1';
      }
      this.hideOutsideChips();
    });
    this.launcherInput.addEventListener('input', () => {
      if (!this.launcherInput) return;
      if (this.launcherPlaceholderEl) {
        this.launcherPlaceholderEl.style.opacity = this.launcherInput.value ? '0' : '1';
      }
    });
    this.launcherInput.addEventListener('mousedown', (event) => event.stopPropagation());
    this.launcherInput.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      event.stopPropagation();
      this.submitLauncherPrompt();
    });

    this.button.append(this.launcherPlaceholderEl, this.launcherInput, sendButton);
    this.startLauncherPlaceholderTypewriter();
  }

  private setButtonClosedChrome(): void {
    if (!this.button) return;
    this.button.classList.remove('vx-open');
    Object.assign(this.button.style, {
      width: 'min(560px, calc(100vw - 40px))',
      height: '48px',
      borderRadius: '999px',
      padding: '7px 7px 7px 0',
    });
  }

  private setButtonOpenChrome(): void {
    if (!this.button) return;
    this.button.classList.add('vx-open');
    Object.assign(this.button.style, {
      width: 'min(560px, calc(100vw - 40px))',
      height: '48px',
      borderRadius: '999px',
      padding: '7px 7px 7px 0',
    });
  }

  private submitLauncherPrompt(): void {
    const text = this.launcherInput?.value.trim() || '';
    if (!text) {
      this.hideOutsideChips();
      this.open();
      return;
    }

    this.hideOutsideChips();
    if (!this.state.isOpen) this.open();
    setTimeout(() => this._sendSuggestionToIframe(text), 600);
    if (this.launcherInput) this.launcherInput.value = '';
  }

  private handleLauncherInputOpen(): void {
    this.hideOutsideChips();
    this.open();
  }

  private showOutsideChips(): void {
    if (
      this.hasStartedChat
      || this.isPageScrolling
      || !this.pageVisible
      || this.state.isOpen
      || !this.outsideChipsContainer
      || document.activeElement !== this.launcherInput
    ) return;

    // Focus and click fire during the same interaction. Do not restart a
    // reveal that is already running (or replay one that is already visible).
    if (this.outsideChipsVisible) return;
    this.outsideChipsVisible = true;

    const chips = Array.from(this.outsideChipsContainer.children) as HTMLElement[];
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    chips.forEach((chip) => {
      chip.getAnimations().forEach((animation) => animation.cancel());
      chip.style.opacity = reduceMotion ? '1' : '0';
      chip.style.transform = reduceMotion
        ? 'translateY(0) scale(1)'
        : 'translateY(12px) scale(0.96)';
    });

    Object.assign(this.outsideChipsContainer.style, {
      display: 'flex',
      visibility: 'visible',
      opacity: '1',
      pointerEvents: 'auto',
      transform: 'translateX(-50%) translateY(0)',
    });

    if (reduceMotion) return;

    // Reveal the suggestion nearest the input first, then fan upward. Waiting
    // one frame establishes the hidden starting pose without flashing content.
    this.outsideChipsRevealFrame = window.requestAnimationFrame(() => {
      this.outsideChipsRevealFrame = null;
      chips.reverse().forEach((chip, index) => {
        chip.style.opacity = '1';
        chip.style.transform = 'translateY(0) scale(1)';
        chip.animate(
          [
            {
              opacity: 0,
              transform: 'translateY(12px) scale(0.96)',
            },
            {
              opacity: 1,
              transform: 'translateY(-1px) scale(1.01)',
              offset: 0.76,
            },
            {
              opacity: 1,
              transform: 'translateY(0) scale(1)',
            },
          ],
          {
            duration: 320,
            delay: index * 45,
            easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
            fill: 'backwards',
          },
        );
      });
    });
  }

  /** Keep launcher-level quick suggestions aligned with the iframe chat state. */
  setConversationStarted(started: boolean): void {
    this.hasStartedChat = started;
    if (this.launcherInput) {
      this.launcherInput.readOnly = started;
      this.launcherInput.value = '';
      this.launcherInput.setAttribute(
        'aria-label',
        started ? 'Continue current conversation' : 'Start a new conversation',
      );
    }

    if (started) {
      if (this.launcherPlaceholderTimer !== null) {
        window.clearInterval(this.launcherPlaceholderTimer);
        this.launcherPlaceholderTimer = null;
      }
      if (this.launcherPlaceholderEl) {
        this.launcherPlaceholderEl.textContent = 'Continue your conversation';
        this.launcherPlaceholderEl.className = 'InteraOne-launcher-placeholder is-resting';
        this.launcherPlaceholderEl.style.opacity = '1';
      }
    } else if (this.launcherInput) {
      this.startLauncherPlaceholderTypewriter();
    }

    if (started) {
      this.hideOutsideChips();
    } else {
      this.showOutsideChips();
    }
  }

  private hideOutsideChips(): void {
    if (!this.outsideChipsContainer) return;
    this.outsideChipsVisible = false;

    if (this.outsideChipsRevealFrame !== null) {
      window.cancelAnimationFrame(this.outsideChipsRevealFrame);
      this.outsideChipsRevealFrame = null;
    }
    Array.from(this.outsideChipsContainer.children).forEach((chip) => {
      chip.getAnimations().forEach((animation) => animation.cancel());
    });

    Object.assign(this.outsideChipsContainer.style, {
      display: 'none',
      visibility: 'hidden',
      opacity: '0',
      pointerEvents: 'none',
      transform: 'translateX(-50%) translateY(8px)',
    });
  }

  private hideFloatingLauncherForScroll(): void {
    if (this.state.isOpen || !this.button) return;
    Object.assign(this.button.style, {
      visibility: 'hidden',
      opacity: '0',
      pointerEvents: 'none',
      transform: 'translateX(-50%) translateY(72px) scale(0.98)',
    });
    this.hideOutsideChips();
  }

  private restoreFloatingLauncherAfterScroll(): void {
    this.isPageScrolling = false;
    if (!this.pageVisible || this.state.isOpen || !this.button) return;

    Object.assign(this.button.style, {
      display: 'flex',
      visibility: 'visible',
      opacity: '0',
      pointerEvents: 'none',
      transform: 'translateX(-50%) translateY(72px) scale(0.98)',
    });

    requestAnimationFrame(() => {
      if (!this.button || !this.pageVisible || this.state.isOpen || this.isPageScrolling) return;
      Object.assign(this.button.style, {
        opacity: '1',
        pointerEvents: 'auto',
        transform: 'translateX(-50%) translateY(0) scale(1)',
      });
      this.showOutsideChips();
    });
  }

  private revealFloatingLauncherAfterClose(): void {
    if (!this.button || !this.pageVisible || this.state.isOpen) return;
    if (this.isPageScrolling) {
      this.hideFloatingLauncherForScroll();
      return;
    }

    Object.assign(this.button.style, {
      display: 'flex',
      visibility: 'visible',
      opacity: '0',
      pointerEvents: 'none',
      transform: 'translateX(-50%) translateY(24px) scale(0.98)',
    });
    requestAnimationFrame(() => {
      if (!this.button || !this.pageVisible || this.state.isOpen || this.isPageScrolling) return;
      Object.assign(this.button.style, {
        opacity: '1',
        pointerEvents: 'auto',
        transform: 'translateX(-50%) translateY(0) scale(1)',
      });
    });
  }

  private setupScrollBehavior(): void {
    if (this.scrollHandler) {
      window.removeEventListener('scroll', this.scrollHandler);
      window.removeEventListener('wheel', this.scrollHandler);
      window.removeEventListener('touchmove', this.scrollHandler);
      document.removeEventListener('scroll', this.scrollHandler, true);
    }

    this.scrollHandler = () => {
      if (this.state.isOpen) return;
      this.isPageScrolling = true;
      this.hideFloatingLauncherForScroll();
      if (this.scrollEndTimer !== null) window.clearTimeout(this.scrollEndTimer);
      this.scrollEndTimer = window.setTimeout(() => {
        this.scrollEndTimer = null;
        this.restoreFloatingLauncherAfterScroll();
      }, 180);
    };
    window.addEventListener('scroll', this.scrollHandler, { passive: true });
    window.addEventListener('wheel', this.scrollHandler, { passive: true });
    window.addEventListener('touchmove', this.scrollHandler, { passive: true });
    // Scroll events do not bubble. Capture them at the document so pages that
    // scroll inside a nested layout are handled as well as window scrolling.
    document.addEventListener('scroll', this.scrollHandler, { passive: true, capture: true });
  }

  private getDockExpandedSize(): { width: number; height: number } {
    const size = this.customSize || { width: 720, height: 520 };
    return {
      width: Math.min(size.width, 760),
      height: Math.min(size.height, 520),
    };
  }

  private applyDockCollapsedChrome(): void {
    if (!this.dockContainer) return;

    Object.assign(this.dockContainer.style, {
      top: 'auto',
      right: 'auto',
      left: '50%',
      width: 'min(560px, calc(100vw - 40px))',
      maxWidth: 'calc(100vw - 40px)',
      height: '48px',
      bottom: '14px',
      borderRadius: '999px',
      transform: 'translateX(-50%) translateY(0) scale(1)',
      opacity: '0',
      pointerEvents: 'none',
      overflow: 'hidden',
    });
    if (this.iframe) this.iframe.style.borderRadius = '999px';
  }

  private applyDockExpandedChrome(): void {
    if (!this.dockContainer) return;

    if (this.isMobileSheet()) {
      Object.assign(this.dockContainer.style, {
        width: '100vw',
        maxWidth: 'none',
        height: '100dvh',
        top: '0',
        right: '0',
        bottom: '0',
        left: '0',
        borderRadius: '0',
        transform: 'none',
        opacity: '1',
        pointerEvents: 'auto',
      });
      if (this.iframe) this.iframe.style.borderRadius = '0';
      return;
    }

    const size = this.getDockExpandedSize();
    Object.assign(this.dockContainer.style, {
      width: `${size.width}px`,
      maxWidth: 'calc(100vw - 40px)',
      height: `min(${size.height}px, calc(100dvh - 120px))`,
      bottom: '14px',
      borderRadius: '16px 16px 0 0',
      transform: 'translateX(-50%) translateY(0) scale(1)',
      opacity: '1',
      pointerEvents: 'auto',
    });
    if (this.iframe) this.iframe.style.borderRadius = '16px 16px 0 0';
  }

  private applyHostDockSpacing(width: number): void {
    const html = document.documentElement;
    if (!html) return;

    if (!this.state.isOpen) return;

    const effectiveWidth = this.isMobileSheet() ? 0 : width;

    if (this.hostWidth === null) {
      this.hostWidth = html.style.width || '';
      this.hostTransition = html.style.transition || '';
      this.hostOverflowX = html.style.overflowX || '';
    }

    if (effectiveWidth > 0) {
      html.style.width = `calc(100vw - ${effectiveWidth}px)`;
      html.style.overflowX = 'hidden';

      const baseTransition = this.hostTransition || '';
      const widthTransition = 'width 0.24s ease-in-out';
      html.style.transition = baseTransition
        ? `${baseTransition}, ${widthTransition}`
        : widthTransition;
      html.style.boxSizing = 'border-box';
    }

    if (this.dockContainer) {
      this.dockContainer.style.right = '0px';
    }
  }

  private restoreHostDockSpacing(): void {
    const html = document.documentElement;
    if (!html || this.hostWidth === null) return;

    html.style.width = this.hostWidth;

    if (this.hostTransition !== null) {
      html.style.transition = this.hostTransition;
    }
    if (this.hostOverflowX !== null) {
      html.style.overflowX = this.hostOverflowX;
    }

    // Reset so the next open captures fresh values
    this.hostWidth = null;
  }


  /**
   * Create and mount chat button
   */
  createButton(): HTMLElement {
    this.ensureHostFonts();
    this.ensureHostLauncherStyles();
    document.getElementById('InteraOne-chat-button')?.remove();
    document.getElementById('InteraOne-outside-chips')?.remove();

    this.button = document.createElement('div');
    this.button.id = 'InteraOne-chat-button';
    this.button.setAttribute('role', 'search');
    this.button.setAttribute('aria-label', this.getLauncherLabel());
    this.button.setAttribute('title', this.getLauncherTitle());

    const buttonTextColor = this.config.appearance?.textColor || 'white';
    this.renderButtonIdleContent();

    Object.assign(this.button.style, {
      position: 'fixed',
      bottom: '14px',
      right: 'auto',
      left: '50%',
      width: 'min(560px, calc(100vw - 40px))',
      height: '48px',
      borderRadius: '999px',
      background: 'rgba(255, 255, 255, 0.96)',
      boxShadow: '0 14px 38px rgba(15, 23, 42, 0.2), 0 0 0 1px rgba(148, 163, 184, 0.36), 0 0 30px rgba(159, 184, 217, 0.34), 0 0 54px rgba(228, 161, 127, 0.18)',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      color: buttonTextColor,
      zIndex: '2147483646', // Maximum safe z-index
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      transform: 'translateX(-50%) translateY(18px) scale(0.98)',
      opacity: '0',
      border: 'none',
      outline: 'none',
      overflow: 'hidden',
      padding: '7px 7px 7px 0',
      // Prevent text/element selection on double-click or drag over the button
      userSelect: 'none',
      WebkitUserSelect: 'none',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      fontFamily: '"Hanken Grotesk", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    });

    // Hover effects
    this.button.addEventListener('mouseenter', () => {
      if (!this.state.isOpen && this.button) {
        this.button.style.transform = 'translateX(-50%) translateY(-2px) scale(1)';
        this.button.style.boxShadow = '0 20px 52px rgba(15, 23, 42, 0.24), 0 0 0 1px rgba(148, 163, 184, 0.48), 0 0 38px rgba(159, 184, 217, 0.46), 0 0 70px rgba(228, 161, 127, 0.24)';
      }
    });

    this.button.addEventListener('mouseleave', () => {
      if (!this.state.isOpen && this.button) {
        this.button.style.transform = 'translateX(-50%) translateY(0) scale(1)';
        this.button.style.boxShadow = '0 14px 38px rgba(15, 23, 42, 0.2), 0 0 0 1px rgba(148, 163, 184, 0.36), 0 0 30px rgba(159, 184, 217, 0.34), 0 0 54px rgba(228, 161, 127, 0.18)';
      }
    });

    this.button.addEventListener('click', () => this.handleLauncherInputOpen());

    // Prevent the host page from getting a blue selection highlight when the
    // user double-clicks the button (selectstart fires before the browser
    // marks anything as selected, so cancelling it is zero-risk).
    this.button.addEventListener('mousedown', (e) => e.preventDefault());
    this.button.addEventListener('selectstart', (e) => e.preventDefault());
    this.outsideClickHandler = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (Date.now() < this.ignoreOutsideClicksUntil) return;
      if (this.state.isOpen) {
        if (this.dockContainer?.contains(target)) return;
        this.close();
        return;
      }
    };
    document.addEventListener('click', this.outsideClickHandler);

    document.body.appendChild(this.button);

    // Animate in
    requestAnimationFrame(() => {
      if (this.button) {
        this.setButtonClosedChrome();
        this.button.style.transform = 'translateX(-50%) translateY(0) scale(1)';
        this.button.style.opacity = '1';
      }
    });
    this.renderOutsideChips();
    this.setupScrollBehavior();
    return this.button;
  }

  /**
   * Render floating chips above the launcher button for suggestions with showOutside=true.
   * Called after createButton(). Hidden when widget is open.
   */
  private renderOutsideChips(): void {
    const outside = (this.config.suggestions || []).filter((s) => s.showOutside && s.text);
    if (outside.length === 0) return;

    this.outsideChipsContainer = document.createElement('div');
    this.outsideChipsContainer.id = 'InteraOne-outside-chips';
    Object.assign(this.outsideChipsContainer.style, {
      position: 'fixed',
      bottom: '74px',
      right: 'auto',
      left: '50%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      gap: '10px',
      zIndex: '2147483644',
      transform: 'translateX(-50%)',
      width: 'min(560px, calc(100vw - 40px))',
      visibility: 'hidden',
      opacity: '0',
      pointerEvents: 'none',
      transition: 'opacity 0.18s ease, transform 0.18s ease, visibility 0.18s ease',
    });

    outside.forEach((s) => {
      const chip = document.createElement('button');
      chip.textContent = s.text;
      Object.assign(chip.style, {
        background: '#19191b',
        color: '#ffffff',
        border: '0',
        borderRadius: '12px',
        padding: '8px 14px',
        fontSize: '14px',
        lineHeight: '1.1',
        fontWeight: '700',
        cursor: 'pointer',
        boxShadow: '0 14px 28px rgba(15, 23, 42, 0.2)',
        whiteSpace: 'normal',
        maxWidth: 'min(340px, calc(100vw - 64px))',
        overflow: 'visible',
        transition: 'all 0.22s cubic-bezier(0.22, 1, 0.36, 1)',
        fontFamily: '"Hanken Grotesk", sans-serif',
        display: 'inline-block',
        backdropFilter: 'blur(8px)',
        wordBreak: 'break-word',
        pointerEvents: 'auto',
      });
      chip.addEventListener('mouseenter', () => {
        chip.style.background = '#111113';
        chip.style.color = '#ffffff';
        chip.style.transform = 'translateY(-2px) scale(1.01)';
        chip.style.boxShadow = '0 22px 44px rgba(15, 23, 42, 0.28)';
      });
      chip.addEventListener('mouseleave', () => {
        chip.style.background = '#19191b';
        chip.style.color = '#ffffff';
        chip.style.transform = 'translateY(0) scale(1)';
        chip.style.boxShadow = '0 18px 36px rgba(15, 23, 42, 0.24)';
      });
      chip.addEventListener('click', () => {
        this.hideOutsideChips();
        // Open the widget, then send the suggestion via postMessage to iframe
        if (!this.state.isOpen) {
          this.open();
          // Give iframe time to be ready, then send text
          setTimeout(() => this._sendSuggestionToIframe(s.text), 600);
        } else {
          this._sendSuggestionToIframe(s.text);
        }
      });
      chip.addEventListener('mousedown', (event) => {
        // Keep the input focused until the chip's click handler runs.
        event.preventDefault();
        event.stopPropagation();
      });
      this.outsideChipsContainer!.appendChild(chip);
    });

    document.body.appendChild(this.outsideChipsContainer);
    this.showOutsideChips();
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
    document.getElementById('InteraOne-widget-dock')?.remove();
    document.getElementById('InteraOne-widget-iframe')?.remove();

    this.iframe = document.createElement('iframe');
    this.iframe.id = 'InteraOne-widget-iframe';
    this.iframe.src = src;
    this.iframe.allow = 'microphone; camera';
    this.iframe.setAttribute('title', 'InteraOne Chat Widget');
    // Use sandbox for security - allow scripts, forms, popups, and same-origin (for localStorage)
    this.iframe.setAttribute('sandbox', 'allow-scripts allow-forms allow-popups allow-same-origin');

    this.dockContainer = document.createElement('div');
    this.dockContainer.id = 'InteraOne-widget-dock';
    Object.assign(this.dockContainer.style, {
      position: 'fixed',
      top: 'auto',
      right: 'auto',
      bottom: '14px',
      left: '50%',
      width: '720px',
      maxWidth: 'calc(100vw - 40px)',
      height: 'min(520px, calc(100dvh - 120px))',
      zIndex: '2147483647',
      transform: 'translateX(-50%) translateY(0) scale(1)',
      transformOrigin: 'bottom center',
      opacity: '0',
      transition: DOCK_TRANSITION,
      pointerEvents: 'none',
      border: 'none',
      borderRadius: '999px',
      background: 'transparent',
      boxShadow: '0 18px 54px rgba(15, 23, 42, 0.26)',
      overflow: 'hidden',
    });

    Object.assign(this.iframe.style, {
      position: 'relative',
      width: '100%',
      height: '100%',
      border: 'none',
      borderRadius: '999px',
      boxShadow: 'none',
      overflow: 'hidden',
      background: 'transparent',
      display: 'block',
      // Prevent the host page from getting a selection highlight when the
      // user double-clicks inside the iframe area.
      userSelect: 'none',
      WebkitUserSelect: 'none',
    });

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
    this.applyResponsiveLayout();
  }

  /**
   * Toggle widget open/close
   */
  toggle(): void {
    if (!this.pageVisible) return;

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
    if (!this.pageVisible) return;
    if (!this.iframe) return;
    if (this.mobileCloseTimer !== null) {
      window.clearTimeout(this.mobileCloseTimer);
      this.mobileCloseTimer = null;
    }
    if (this.outsideChipsRevealFrame !== null) {
      window.cancelAnimationFrame(this.outsideChipsRevealFrame);
      this.outsideChipsRevealFrame = null;
    }

    if (this.state.isOpen) {
      if (this.button) {
        Object.assign(this.button.style, {
          display: 'none',
          visibility: 'hidden',
          opacity: '0',
          pointerEvents: 'none',
          transform: 'translateX(-50%) translateY(16px) scale(0.98)',
        });
      }
      this.hideOutsideChips();
      if (this.dockContainer) {
        this.dockContainer.style.display = 'block';
        this.applyDockExpandedChrome();
      }
      return;
    }

    this.state.isOpen = true;
    this.playOpenSound();
    this.ignoreOutsideClicksUntil = Date.now() + 250;
    if (this.dockContainer) {
      this.dockContainer.style.display = 'block';
      if (this.isMobileSheet()) {
        // Establish full-screen geometry before the first visible frame. This
        // avoids morphing the 48px launcher pill into a large rounded skeleton.
        this.dockContainer.style.transition = 'none';
        this.applyDockExpandedChrome();
        Object.assign(this.dockContainer.style, {
          opacity: '0',
          pointerEvents: 'none',
          transform: 'translateY(20px)',
        });
        void this.dockContainer.offsetHeight;
        this.dockContainer.style.transition = DOCK_TRANSITION;
      } else {
        this.applyDockCollapsedChrome();
        this.dockContainer.style.opacity = '1';
      }
    }

    if (this.button) {
      this.setButtonOpenChrome();
      Object.assign(this.button.style, {
        transform: 'translateX(-50%) translateY(16px) scale(0.98)',
        opacity: '0',
        visibility: 'hidden',
        pointerEvents: 'none',
        display: 'none',
      });
      this.button.setAttribute('aria-label', 'Close chat');
      this.button.setAttribute('title', 'Close chat');
    }

    requestAnimationFrame(() => {
      this.applyDockExpandedChrome();
    });

    // Hide outside chips while widget is open.
    this.hideOutsideChips();

    if (this.onToggle) this.onToggle(true);
  }

  /**
   * Close widget
   */
  close(): void {
    if (!this.iframe) return;

    if (this.mobileCloseTimer !== null) {
      window.clearTimeout(this.mobileCloseTimer);
      this.mobileCloseTimer = null;
    }
    if (this.outsideChipsRevealFrame !== null) {
      window.cancelAnimationFrame(this.outsideChipsRevealFrame);
      this.outsideChipsRevealFrame = null;
    }
    const isMobile = this.isMobileSheet();
    this.state.isOpen = false;
    this.activePanelWidth = null;

    if (this.button) {
      this.setButtonClosedChrome();
      if (isMobile) {
        Object.assign(this.button.style, {
          display: 'none',
          visibility: 'hidden',
          opacity: '0',
          pointerEvents: 'none',
        });
      } else {
        Object.assign(this.button.style, {
          transform: 'translateX(-50%) translateY(0) scale(1)',
          opacity: '1',
          visibility: 'visible',
          pointerEvents: 'auto',
          display: this.pageVisible ? 'flex' : 'none',
        });
      }
      this.button.setAttribute('aria-label', this.getLauncherLabel());
      this.button.setAttribute('title', this.getLauncherTitle());
    }
    if (!isMobile && this.isPageScrolling) this.hideFloatingLauncherForScroll();

    // Animate widget out
    if (this.dockContainer) {
      if (isMobile) {
        // Lock in a fully open frame before starting the exit. Mobile browsers
        // can otherwise coalesce the state changes and skip the transition.
        this.dockContainer.style.transition = 'none';
        this.applyDockExpandedChrome();
        Object.assign(this.dockContainer.style, {
          opacity: '1',
          pointerEvents: 'none',
          transform: 'translateY(0)',
        });
        void this.dockContainer.offsetHeight;
        this.dockContainer.style.transition = 'transform 0.36s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease';
        requestAnimationFrame(() => {
          if (this.state.isOpen || !this.dockContainer) return;
          Object.assign(this.dockContainer.style, {
            opacity: '0',
            transform: 'translateY(100%)',
          });
        });
        this.mobileCloseTimer = window.setTimeout(() => {
          this.mobileCloseTimer = null;
          if (this.state.isOpen || !this.dockContainer) return;
          this.dockContainer.style.transition = 'none';
          this.applyDockCollapsedChrome();
          void this.dockContainer.offsetHeight;
          this.dockContainer.style.transition = DOCK_TRANSITION;
          this.revealFloatingLauncherAfterClose();
        }, 380);
      } else {
        this.applyDockCollapsedChrome();
      }
    }

    if (!isMobile) this.showOutsideChips();

    if (this.onToggle) this.onToggle(false);
  }

  setPageVisibility(isVisible: boolean): void {
    this.pageVisible = isVisible;

    if (!isVisible) {
      if (this.state.isOpen) this.close();
      if (this.button) this.button.style.display = 'none';
      this.hideOutsideChips();
      if (this.dockContainer) this.dockContainer.style.display = 'none';
      return;
    }

    if (this.dockContainer) this.dockContainer.style.display = 'block';

    // Re-apply dock spacing and visibility if the widget is already open —
    // SPA navigations can change scroll/layout state which desyncs the squeeze,
    // and the dock container's opacity/transform may need to be reasserted.
    if (this.state.isOpen) {
      if (this.dockContainer) {
        this.applyDockExpandedChrome();
      }
    }

    if (!this.state.isOpen && this.button) {
      if (this.isPageScrolling) {
        this.hideFloatingLauncherForScroll();
      } else {
        Object.assign(this.button.style, {
          display: 'flex',
          opacity: '1',
          visibility: 'visible',
          transform: 'translateX(-50%) translateY(0) scale(1)',
          pointerEvents: 'auto',
        });
      }
    }
    if (!this.state.isOpen) this.showOutsideChips();
  }

  /**
   * Setup responsive behavior
   */
  private setupResponsive(): void {
    this.resizeHandler = () => this.applyResponsiveLayout();
    window.addEventListener('resize', this.resizeHandler);
    this.applyResponsiveLayout();
  }

  private applyResponsiveLayout(): void {
    if (!this.iframe) return;

    if (this.isMobileSheet()) {
      if (this.mobileCloseTimer !== null) return;
      if (this.dockContainer) {
        if (this.state.isOpen) {
          this.applyDockExpandedChrome();
        } else {
          Object.assign(this.dockContainer.style, {
            right: 'auto',
            left: '50%',
            top: 'auto',
            bottom: '14px',
            marginLeft: '0',
            background: 'transparent',
          });
          this.applyDockCollapsedChrome();
        }
      }
      if (this.iframe) {
        this.iframe.style.borderRadius = this.state.isOpen ? '0' : '999px';
      }
      return;
    }

    if (this.dockContainer) {
      const size = this.customSize || { width: 720, height: 520 };
      Object.assign(this.dockContainer.style, {
        width: `${Math.min(size.width, 760)}px`,
        maxWidth: 'calc(100vw - 40px)',
        height: `min(${Math.min(size.height, 520)}px, calc(100dvh - 120px))`,
        right: 'auto',
        left: '50%',
        top: 'auto',
        bottom: '14px',
        marginLeft: '0',
        border: 'none',
        borderRadius: this.state.isOpen ? '16px 16px 0 0' : '999px',
        background: 'transparent',
        overflow: 'hidden',
      });
      this.dockContainer.style.transformOrigin = 'bottom center';
      if (this.state.isOpen) this.applyDockExpandedChrome();
      else this.applyDockCollapsedChrome();
    }
    if (this.iframe) {
      this.iframe.style.borderRadius = this.state.isOpen ? '16px 16px 0 0' : '999px';
    }
  }

  private getPanelWidth(): number {
    // Use the locked width while the panel is open to avoid jitter from
    // scrollbar-induced innerWidth changes.
    if (this.activePanelWidth !== null) return this.activePanelWidth;
    return Math.round(window.innerWidth * 0.25);
  }

  /**
   * Set toggle callback
   */
  onToggleChange(callback: (isOpen: boolean) => void): void {
    this.onToggle = callback;
  }



  /**
   * Cleanup
   */
  destroy(): void {
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
      this.resizeHandler = null;
    }
    if (this.scrollHandler) {
      window.removeEventListener('scroll', this.scrollHandler);
      window.removeEventListener('wheel', this.scrollHandler);
      window.removeEventListener('touchmove', this.scrollHandler);
      document.removeEventListener('scroll', this.scrollHandler, true);
      this.scrollHandler = null;
    }
    if (this.scrollEndTimer !== null) {
      window.clearTimeout(this.scrollEndTimer);
      this.scrollEndTimer = null;
    }
    if (this.mobileCloseTimer !== null) {
      window.clearTimeout(this.mobileCloseTimer);
      this.mobileCloseTimer = null;
    }
    if (this.outsideChipsRevealFrame !== null) {
      window.cancelAnimationFrame(this.outsideChipsRevealFrame);
      this.outsideChipsRevealFrame = null;
    }
    if (this.outsideClickHandler) {
      document.removeEventListener('click', this.outsideClickHandler);
      this.outsideClickHandler = null;
    }
    if (this.launcherPlaceholderTimer !== null) {
      window.clearInterval(this.launcherPlaceholderTimer);
      this.launcherPlaceholderTimer = null;
    }
    if (this.openSoundContext) {
      void this.openSoundContext.close().catch(() => undefined);
      this.openSoundContext = null;
    }
    if (this.button) this.button.remove();
    if (this.outsideChipsContainer) this.outsideChipsContainer.remove();
    if (this.iframe) this.iframe.remove();
    if (this.dockContainer) this.dockContainer.remove();
    this.restoreHostDockSpacing();
    this.button = null;
    this.launcherInput = null;
    this.launcherPlaceholderEl = null;
    this.outsideChipsContainer = null;
    this.iframe = null;
    this.dockContainer = null;
  }
}
