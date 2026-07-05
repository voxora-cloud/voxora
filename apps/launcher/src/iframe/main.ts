import { state, PROTO_VERSION, API_BASE_URL, normalizeInteractionSource } from './config';
import { elements, adjustTextareaHeight, renderMaximizeIcon, addMessage, showTyping, hideTyping, showOpenSkeleton, INTERAONE_LOGO_SVG } from './ui';
import { bootstrapSession } from './api';
import { initializeSocket } from './socket';
import { setupEventListeners } from './events';
import { clearStoredSession } from './utils/session';

let selectedTitle = '';

function updateGreeting(name?: string, overrideSubtext?: string) {
  const greeting = elements.greetingTitle;
  const subtext = elements.greetingSubtext;

  if (greeting) {
    if (!selectedTitle) {
      const titles = [
        "👋 Welcome!",
        "How can we help?",
        "Need support?",
        "Got a question?",
        "Let's chat.",
        "We're listening.",
        "What's your challenge today?",
        "We're here if you need us.",
        "Talk to us.",
        "Let's figure it out.",
      ];
      selectedTitle = titles[Math.floor(Math.random() * titles.length)];
    }
    greeting.textContent = selectedTitle;
  }
  if (subtext) {
    subtext.textContent = overrideSubtext || 'Ask anything or pick a suggestion below to get started.';
  }
}

const DEFAULT_SUGGESTIONS: Array<{ text: string; showOutside: boolean }> = [
  { text: 'Get help with a question', showOutside: false },
  { text: 'Learn about services', showOutside: false },
  { text: 'Contact support', showOutside: false },
];

function applyWidgetAppearance(cfg: any) {
  if (!cfg) return;
  state._uiConfig = cfg || { appearance: {} };

  const avatar = elements.brandAvatar || document.getElementById('vx-avatar');
  const brandLabel = document.querySelector('.assistant-brand-label') as HTMLElement | null;
  const input = document.getElementById('messageInput') as HTMLInputElement;
  const appearance = cfg.appearance || {};

  // Apply Theme
  const rawTheme = String(appearance.theme || 'dark').toLowerCase();
  const normalizedTheme = rawTheme.includes('light') ? 'light-theme' : 'dark-theme';
  document.documentElement.classList.remove('light-theme', 'dark-theme');
  document.documentElement.classList.add(normalizedTheme);
  document.body.classList.remove('light-theme', 'dark-theme');
  document.body.classList.add(normalizedTheme);

  updateGreeting(state.userName, appearance.welcomeMessage);
  if (brandLabel && cfg.displayName) brandLabel.textContent = `${cfg.displayName} Assistant`;

  // Apply Background Pattern
  const welcomeScreen = document.getElementById('welcomeScreen');
  if (welcomeScreen) {
    welcomeScreen.classList.remove('pattern-none', 'pattern-uiverse-alexruix', 'pattern-dots', 'pattern-grid', 'pattern-island', 'pattern-3d-cubes', 'pattern-checkerboard', 'pattern-hexagonal', 'pattern-polka', 'pattern-radial-stripes', 'pattern-plaid');
    const selectedPattern = appearance.pattern || 'none';
    if (selectedPattern !== 'none') {
      welcomeScreen.classList.add(`pattern-${selectedPattern}`);
    }
  }

  if (input && !input.value) {
    input.placeholder = 'Ask anything';
  }

  if (avatar) {
    avatar.innerHTML = '';
    avatar.innerHTML = INTERAONE_LOGO_SVG;
  }


  // Render dynamic suggestion buttons
  const suggestionsContainer = document.getElementById('suggestions');
  if (suggestionsContainer) {
    const configuredSuggestions: Array<{ text: string; showOutside: boolean }> = Array.isArray(cfg.suggestions)
      ? cfg.suggestions.filter((s: { text?: string }) => !!s.text)
      : [];
    const suggestions = configuredSuggestions.length ? configuredSuggestions : DEFAULT_SUGGESTIONS;
    suggestionsContainer.innerHTML = '';
    suggestions.forEach((s, index) => {
      if (!s.text) return;
      const btn = document.createElement('button');
      btn.className = 'suggestion-btn';
      btn.dataset['text'] = s.text;
      btn.textContent = s.text;
      btn.style.animationDelay = `${Math.min(index * 60, 240)}ms`;
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

type WidgetTab = 'chat' | 'history';

function setActiveTab(tab: WidgetTab) {
  const tabs: Array<{ key: WidgetTab; el: HTMLButtonElement | null }> = [
    { key: 'chat', el: elements.tabChat || null },
    { key: 'history', el: elements.tabHistory || null },
  ];

  tabs.forEach(({ key, el }) => {
    if (!el) return;
    const isActive = key === tab;
    el.classList.toggle('active', isActive);
    el.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });

  const inputArea = document.querySelector('.input-area') as HTMLElement | null;
  const messagesContainer = elements.messagesContainer as HTMLElement | null;
  const welcomeScreen = elements.welcomeScreen as HTMLElement | null;
  const historyOverlay = elements.historyOverlay as HTMLElement | null;

  if (tab === 'history') {
    if (elements.historyBtn) elements.historyBtn.click();
    if (inputArea) inputArea.style.display = 'none';
    if (messagesContainer) messagesContainer.style.display = 'none';
    if (welcomeScreen) welcomeScreen.style.display = 'none';
    return;
  }

  if (historyOverlay) historyOverlay.style.display = 'none';
  if (elements.historySearch) elements.historySearch.value = '';

  if (inputArea) inputArea.style.display = '';
  const hasMessages = !!(messagesContainer && messagesContainer.childElementCount > 0);
  if (messagesContainer) messagesContainer.style.display = hasMessages ? 'flex' : 'none';
  if (welcomeScreen) welcomeScreen.style.display = hasMessages ? 'none' : 'flex';
}

async function handleInitWidget(payload: any) {
  if (state._connectTimeout) { clearTimeout(state._connectTimeout); state._connectTimeout = null; }

  state.InteraOnePublicKey = payload.publicKey;
  state.interactionSource = normalizeInteractionSource(payload.source || state.interactionSource);
  if (payload.identity?.name) {
    state.userName = payload.identity.name;
  }
  (window as any).__InteraOnePageUrl = payload.pageUrl;
  (window as any).__InteraOnePageTitle = payload.pageTitle || '';

  if (payload.isMobile) {
    document.documentElement.classList.add('is-mobile');
    document.body.classList.add('is-mobile');
  } else {
    document.documentElement.classList.remove('is-mobile');
    document.body.classList.remove('is-mobile');
  }

  if (payload.appearance) applyWidgetAppearance(payload.appearance);

  await bootstrapSession(payload, function (token: string, sessionId: string) {
    state.widgetToken = token;
    state.currentSessionId = sessionId;

    initializeSocket();

    if (elements.messageInput) {
      elements.messageInput.disabled = false;
      elements.messageInput.placeholder = 'Ask anything';
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

  if (elements.tabChat) elements.tabChat.addEventListener('click', () => setActiveTab('chat'));
  if (elements.tabHistory) elements.tabHistory.addEventListener('click', () => setActiveTab('history'));
  if (elements.closeHistoryBtn) elements.closeHistoryBtn.addEventListener('click', () => setActiveTab('chat'));

  adjustTextareaHeight();

  if (elements.messageInput && elements.sendBtn) {
    elements.messageInput.disabled = true;
    elements.messageInput.placeholder = 'Connecting...';
    elements.sendBtn.disabled = true;
  }

  state._connectTimeout = setTimeout(function () {
    if (elements.messageInput && elements.messageInput.disabled) {
      elements.messageInput.disabled = false;
      elements.messageInput.placeholder = 'Connection failed — try refreshing';
      console.warn('[InteraOneWidget] INIT_WIDGET not received within 12s — unblocking input');
    }
  }, 12000) as unknown as number;

  if (window.parent) {
    window.parent.postMessage({ type: 'WIDGET_READY', version: PROTO_VERSION }, state.parentOrigin || '*');
  }
});

window.addEventListener('message', function (event) {
  if (state.parentOrigin && event.origin !== state.parentOrigin) return;
  const msg = event.data;
  if (!msg || !msg.type || msg.version !== PROTO_VERSION) return;

  switch (msg.type) {
    case 'SHOW_SKELETON':
      showOpenSkeleton(msg.payload?.durationMs ?? 1000);
      break;
    case 'INIT_WIDGET':
      handleInitWidget(msg.payload);
      break;

    case 'USER_IDENTITY':
      if (state.InteraOnePublicKey && API_BASE_URL) {
        if (msg.payload?.name) {
          state.userName = msg.payload.name;
          updateGreeting(state.userName, state._uiConfig?.appearance?.welcomeMessage);
        }
        const refreshPayload = {
          publicKey: state.InteraOnePublicKey,
          apiUrl: API_BASE_URL,
          visitorId: msg.payload.visitorId || '',
          identity: msg.payload,
          pageUrl: (window as any).__InteraOnePageUrl || '',
          source: state.interactionSource || 'widget',
        };
        clearStoredSession(state.InteraOnePublicKey);
        bootstrapSession(refreshPayload, function (token: string, sessionId: string) {
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
      (window as any).__InteraOnePageUrl = msg.payload.pageUrl;
      (window as any).__InteraOnePageTitle = msg.payload.pageTitle || '';
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
        metadata: {
          senderName: state.userName,
          senderEmail: state.userEmail,
          source: 'widget',
          interactionSource: state.interactionSource || 'widget'
        }
      });
    }
  },
  joinConversation: (conversationId: string) => {
    if (state.socket) {
      state.socket.emit('join_conversation', conversationId);
    }
  }
};
