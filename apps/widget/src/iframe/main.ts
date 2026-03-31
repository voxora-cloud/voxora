import { state, PROTO_VERSION, DEFAULT_WIDGET_ICON_URL, API_BASE_URL } from './config';
import { elements, adjustTextareaHeight, renderMaximizeIcon, addMessage, showTyping, hideTyping } from './ui';
import { bootstrapSession } from './api';
import { initializeSocket } from './socket';
import { setupEventListeners } from './events';
import { clearStoredSession } from './utils/session';

function applyWidgetAppearance(cfg: any) {
  if (!cfg) return;
  state._uiConfig = cfg || { appearance: {} };

  const title = document.getElementById('vx-title') || document.querySelector('.assistant-header h2');
  const subtitle = document.getElementById('vx-subtitle');
  const avatar = document.getElementById('vx-avatar') || document.querySelector('.assistant-header .avatar');
  const appRoot = document.getElementById('app');
  const sendButton = document.getElementById('sendBtn');
  const input = document.getElementById('messageInput') as HTMLInputElement;
  const historyButton = document.getElementById('historyBtn');
  const appearance = cfg.appearance || {};

  const primaryColor = appearance.primaryColor || cfg.primaryColor;
  if (primaryColor) {
    document.documentElement.style.setProperty('--vx-accent', primaryColor);
    document.documentElement.style.setProperty('--vx-accent-color', primaryColor);
    // Send button color is driven by CSS var(--vx-accent) — no inline override needed
    if (avatar) {
      avatar.style.background = primaryColor;
      avatar.style.boxShadow = `0 4px 12px ${primaryColor}55`;
    }
  }

  const bgColor = cfg.backgroundColor || appearance.backgroundColor;
  if (bgColor) {
    document.documentElement.style.setProperty('--vx-bg', bgColor);
    // Keep inline fallbacks for elements painted before CSS var resolves
    if (appRoot) appRoot.style.backgroundColor = bgColor;
    const historyOverlay = document.querySelector('.history-overlay') as HTMLElement;
    if (historyOverlay) historyOverlay.style.background = bgColor;
  }

  if (appearance.textColor) {
    document.documentElement.style.setProperty('--vx-text', appearance.textColor);
    const styleEl = document.createElement('style');
    styleEl.innerHTML = `
      .widget-app, .widget-topbar-title, .history-header h3, .history-item-preview,
      .assistant-header h2, .suggestion-btn, .message-bubble, #messageInput,
      .message.user .message-bubble, .message.agent .message-bubble,
      .message-bubble .md p, .message-bubble .md strong, .message-bubble .md li,
      .history-state, details.thought-box summary, .thought-content, .thought-step-label,
      .topbar-action-btn, .close-history-btn, #sendBtn, #sendBtn svg {
        color: ${appearance.textColor} !important;
      }
      .suggestion-btn svg, .history-item-date, .history-header p,
      .thought-step.thinking .thought-step-label {
        color: ${appearance.textColor} !important;
        opacity: 0.7;
      }
      #messageInput::placeholder {
        color: ${appearance.textColor} !important;
        opacity: 0.5;
      }
    `;
    document.head.appendChild(styleEl);
  }

  if (cfg.displayName && title) {
    title.textContent = appearance.welcomeMessage || cfg.displayName;
  }
  const topbarTitle = document.querySelector('.widget-topbar-title') as HTMLElement | null;
  if (topbarTitle && cfg.displayName) topbarTitle.textContent = cfg.displayName;
  if (appearance.launcherText && subtitle) {
    subtitle.textContent = appearance.launcherText;
  }
  if (appearance.launcherText && input && !input.value) {
    input.placeholder = appearance.launcherText;
  }

  const finalLogoUrl = appearance.logoUrl || cfg.logoUrl || DEFAULT_WIDGET_ICON_URL;
  if (finalLogoUrl) {
    if (avatar) {
      avatar.innerHTML = '';
      const img = document.createElement('img');
      img.src = finalLogoUrl;
      img.alt = (cfg.displayName || 'Logo') + ' logo';
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = 'cover';
      img.style.borderRadius = '999px';
      img.onerror = function() {
        if (img.src !== DEFAULT_WIDGET_ICON_URL) {
          img.src = DEFAULT_WIDGET_ICON_URL;
          return;
        }
        avatar!.textContent = 'V';
      };
      avatar.appendChild(img);
    }
  } else {
    if (avatar) avatar.textContent = 'V';
  }

  const acceptMediaFiles = cfg?.features?.acceptMediaFiles ?? cfg?.acceptMediaFiles ?? true;
  if (elements.attachBtn) {
    elements.attachBtn.style.display = acceptMediaFiles ? 'flex' : 'none';
    elements.attachBtn.disabled = !acceptMediaFiles;
  }
  if (elements.fileInput) elements.fileInput.disabled = !acceptMediaFiles;

  // Render dynamic suggestion buttons
  const suggestionsContainer = document.getElementById('suggestions');
  if (suggestionsContainer) {
    const suggestions: Array<{ text: string; showOutside: boolean }> = Array.isArray(cfg.suggestions)
      ? cfg.suggestions
      : [];
    suggestionsContainer.innerHTML = '';
    suggestions.forEach((s) => {
      if (!s.text) return;
      const btn = document.createElement('button');
      btn.className = 'suggestion-btn';
      btn.dataset['text'] = s.text;
      btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg><span>${s.text}</span>`;
      btn.addEventListener('click', () => {
        const input = document.getElementById('messageInput') as HTMLInputElement | null;
        if (!input) return;
        input.value = s.text;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        // Auto-send
        const sendBtn = document.getElementById('sendBtn') as HTMLButtonElement | null;
        if (sendBtn && !sendBtn.disabled) sendBtn.click();
      });
      suggestionsContainer.appendChild(btn);
    });
  }
}

function requestResize(width: number, height: number, centered: boolean) {
  const target = state.parentOrigin || '*';
  if (!window.parent) return;
  window.parent.postMessage(
    { type: 'RESIZE_WIDGET', version: PROTO_VERSION, payload: { width, height, centered: !!centered } },
    target
  );
}

function toggleMaximizeWidget() {
  state._isMaximized = !state._isMaximized;
  if (state._isMaximized) {
    const width = Math.min(1100, Math.max(760, window.innerWidth - 80));
    const height = Math.min(680, Math.max(520, window.innerHeight - 100));
    requestResize(width, height, true);
  } else {
    requestResize(380, 600, false);
  }
  renderMaximizeIcon();
}

function minimizeWidget() {
  const target = state.parentOrigin || '*';
  if (window.parent) {
    window.parent.postMessage({ type: 'CLOSE_WIDGET', version: PROTO_VERSION }, target);
  }
}

async function handleInitWidget(payload: any) {
  if (state._connectTimeout) { clearTimeout(state._connectTimeout); state._connectTimeout = null; }

  state.voxoraPublicKey = payload.publicKey;
  (window as any).__voxoraPageUrl = payload.pageUrl;
  (window as any).__voxoraPageTitle = payload.pageTitle || '';

  if (payload.appearance) applyWidgetAppearance(payload.appearance);

  await bootstrapSession(payload, function(token: string, sessionId: string) {
    state.widgetToken = token;
    state.currentSessionId = sessionId;

    initializeSocket();

    if (elements.messageInput) {
      elements.messageInput.disabled = false;
      elements.messageInput.placeholder = 'Type your message...';
    }
  });
}

document.addEventListener("DOMContentLoaded", function () {
  setupEventListeners();

  if (elements.minimizeBtn) elements.minimizeBtn.addEventListener('click', minimizeWidget);
  if (elements.maximizeBtn) {
    elements.maximizeBtn.addEventListener('click', toggleMaximizeWidget);
    renderMaximizeIcon();
  }

  adjustTextareaHeight();

  if (elements.messageInput && elements.sendBtn) {
    elements.messageInput.disabled = true;
    elements.messageInput.placeholder = 'Connecting...';
    elements.sendBtn.disabled = true;
  }

  state._connectTimeout = setTimeout(function() {
    if (elements.messageInput && elements.messageInput.disabled) {
      elements.messageInput.disabled = false;
      elements.messageInput.placeholder = 'Connection failed — try refreshing';
      console.warn('[VoxoraWidget] INIT_WIDGET not received within 12s — unblocking input');
    }
  }, 12000) as unknown as number;

  if (window.parent) {
    window.parent.postMessage({ type: 'WIDGET_READY', version: PROTO_VERSION }, state.parentOrigin || '*');
  }
});

window.addEventListener('message', function(event) {
  if (state.parentOrigin && event.origin !== state.parentOrigin) return;
  const msg = event.data;
  if (!msg || !msg.type || msg.version !== PROTO_VERSION) return;

  switch (msg.type) {
    case 'INIT_WIDGET':
      handleInitWidget(msg.payload);
      break;

    case 'USER_IDENTITY':
      if (state.voxoraPublicKey && API_BASE_URL) {
        const refreshPayload = {
          publicKey: state.voxoraPublicKey,
          apiUrl: API_BASE_URL,
          visitorId: msg.payload.visitorId || '',
          identity: msg.payload,
          pageUrl: (window as any).__voxoraPageUrl || '',
        };
        clearStoredSession(state.voxoraPublicKey);
        bootstrapSession(refreshPayload, function(token: string, sessionId: string) {
          state.widgetToken = token;
          state.currentSessionId = sessionId;
          if (state.socket) {
            state.socket.disconnect();
            state.socket = null;
          }
          initializeSocket();
        });
      }
      break;

    case 'PAGE_CHANGE':
      (window as any).__voxoraPageUrl = msg.payload.pageUrl;
      (window as any).__voxoraPageTitle = msg.payload.pageTitle || '';
      break;

    case 'SUGGESTION_CLICK': {
      const text: string = msg.payload?.text;
      if (!text) break;
      const input = document.getElementById('messageInput') as HTMLInputElement | null;
      if (input) {
        input.value = text;
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
      const sendBtn = document.getElementById('sendBtn') as HTMLButtonElement | null;
      if (sendBtn && !sendBtn.disabled) sendBtn.click();
      break;
    }
  }
});

(window as any).chatWidget = {
  addMessage,
  showTyping,
  hideTyping,
  sendMessage: (message: string) => {
    if (state.socket && state.chatId) {
      state.socket.emit('send_message', {
        conversationId: state.chatId,
        content: message,
        type: 'text',
        metadata: { senderName: state.userName, senderEmail: state.userEmail, source: 'widget' }
      });
    }
  },
  joinConversation: (conversationId: string) => {
    if (state.socket) {
      state.socket.emit('join_conversation', conversationId);
    }
  }
};