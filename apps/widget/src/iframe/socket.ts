import { io } from "socket.io-client";
import { state, API_BASE_URL, PROTO_VERSION } from './config';
import { elements, addMessage, addSystemNotice, typeMessage, removeTypingDots, scrollToBottom, showTyping, hideTyping, renderThoughtSteps } from './ui';
import { extractThoughtSteps, parseMarkdown } from './utils/markdown';

let authRetryCount = 0;
const MAX_AUTH_RETRIES = 3;

type ConversationVisualState = 'human' | 'resolved' | 'closed' | 'pending' | 'open';

function getInputArea(): HTMLElement | null {
  return document.querySelector('.input-area') as HTMLElement | null;
}

function getStateBanner(): HTMLElement | null {
  return document.getElementById('conversationStateBanner');
}

function removeStateBanner() {
  const banner = getStateBanner();
  if (banner) banner.remove();
}

function showStateBanner(stateType: ConversationVisualState, title: string, subtitle?: string) {
  const app = document.getElementById('app');
  const topbar = document.querySelector('.widget-topbar');
  if (!app || !topbar) return;

  let banner = getStateBanner();
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'conversationStateBanner';
    banner.className = 'conversation-state-banner';
    topbar.insertAdjacentElement('afterend', banner);
  }

  banner.className = `conversation-state-banner state-${stateType}`;
  banner.innerHTML = `
    <div class="state-main">
      <span class="state-dot"></span>
      <span class="state-title">${title}</span>
    </div>
    ${subtitle ? `<div class="state-subtitle">${subtitle}</div>` : ''}
  `;
}

function setComposerEnabled(enabled: boolean, placeholder?: string) {
  const inputArea = getInputArea();
  if (inputArea) inputArea.classList.toggle('is-disabled', !enabled);

  if (elements.messageInput) {
    elements.messageInput.disabled = !enabled;
    if (placeholder) elements.messageInput.placeholder = placeholder;
  }

  if (elements.sendBtn) {
    if (!enabled) {
      elements.sendBtn.disabled = true;
    } else {
      elements.sendBtn.disabled = !elements.messageInput?.value.trim();
    }
  }

  if (elements.attachBtn) elements.attachBtn.disabled = !enabled;
}

function clearOutcomePanel() {
  const panel = document.getElementById('conv-closed-banner');
  if (panel) panel.remove();
}

function resetConversationToNew() {
  clearOutcomePanel();
  removeStateBanner();
  state.chatId = null;
  state.isConnected = false;
  state._escalationShown = false;
  state._streamBubbleEl = null;
  state._streamText = '';
  state._thoughtText = '';
  state._thoughtSteps = [];

  if (elements.messagesContainer) {
    elements.messagesContainer.innerHTML = '';
  }

  setComposerEnabled(true, 'Type your message...');
  if (elements.messageInput) {
    elements.messageInput.value = '';
    elements.messageInput.focus();
  }

  addSystemNotice('Started a new conversation. Ask anything and we will help you.');
}

function showOutcomePanel(status: 'resolved' | 'closed') {
  clearOutcomePanel();
  const messagesContainer = elements.messagesContainer;
  if (!messagesContainer) return;

  const panel = document.createElement('div');
  panel.className = `conv-outcome-panel ${status === 'resolved' ? 'resolved' : 'closed'}`;
  panel.id = 'conv-closed-banner';
  panel.innerHTML = `
    <div class="outcome-icon">${status === 'resolved' ? '✅' : '🔒'}</div>
    <div class="outcome-content">
      <div class="outcome-title">${status === 'resolved' ? 'Conversation resolved' : 'Conversation closed'}</div>
      <div class="outcome-sub">You can start a fresh chat anytime if you need more help.</div>
    </div>
    <button class="outcome-cta" id="bannerNewChatBtn">Start new chat</button>
  `;

  messagesContainer.appendChild(panel);
  scrollToBottom();

  document.getElementById('bannerNewChatBtn')?.addEventListener('click', resetConversationToNew, { once: true });
}

export function initializeSocket() {
  if (!state.widgetToken) {
    console.error('Missing widget token, cannot connect');
    return;
  }
  
  state.socket = io(API_BASE_URL, {
    auth: { token: state.widgetToken },
    transports: ['websocket', 'polling']
  });

  state.socket.on('connect_error', (err: any) => {
    console.error('Socket connection error:', err.message);
    if (err.message.includes('Authentication error') && state.voxoraPublicKey) {
      if (authRetryCount >= MAX_AUTH_RETRIES) {
        console.error('Socket: Max auth retries reached. Stopping reconnection loop.');
        return;
      }
      authRetryCount++;
      const backoffDelay = Math.min(1000 * Math.pow(2, authRetryCount - 1), 8000);
      
      setTimeout(() => {
        fetch(`${API_BASE_URL}/api/v1/widget/auth/token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ voxoraPublicKey: state.voxoraPublicKey, origin: window.location.origin })
        })
      .then(response => response.json())
      .then(data => {
        if (data.success && data.data.token) {
          state.widgetToken = data.data.token;
          state.socket?.disconnect();
          setTimeout(() => {
            state.socket = io(API_BASE_URL, {
              auth: { token: state.widgetToken },
              transports: ['websocket', 'polling']
            });
            bindSocketEvents();
          }, 1000);
        }
      })
      .catch(() => {});
      }, backoffDelay);
    }
  });

  bindSocketEvents();
}

function bindSocketEvents() {
  if (!state.socket) return;
  const socket = state.socket;

  socket.off('connect');
  socket.on('connect', () => {
    authRetryCount = 0;
    console.log('Socket connected for widget user with ID:', socket.id);
    if (state.chatId) {
      socket.emit('join_conversation', state.chatId);
    }
  });

  socket.off('disconnect');
  socket.on('disconnect', () => {
    console.log('Socket disconnected');
  });

  socket.off('new_message');
  socket.on('new_message', (data: any) => {
    if (data.conversationId !== state.chatId) return;
    if (data.message?.metadata?.source === 'widget') return;

    if (elements.sendBtn) elements.sendBtn.disabled = false;

    if (data.message?.metadata?.source === 'system') {
      removeTypingDots();
      addSystemNotice(data.message.content);
      return;
    }

    if (data.message?.type === 'file' || data.message?.type === 'image') {
      removeTypingDots();
      addMessage(data.message.content, 'agent', 'Support Agent', 'file');
      return;
    }

    if (state._streamBubbleEl) {
      const inlineDots = state._streamBubbleEl.querySelector('.typing-dots-inline') as HTMLElement;
      if (inlineDots) inlineDots.style.display = 'none';
      const stepsEl = state._streamBubbleEl.querySelector('.thought-steps');
      if (stepsEl) renderThoughtSteps(stepsEl, state._thoughtSteps, -1);
      
      const responseContent = state._streamBubbleEl.querySelector('.response-content');
      if (responseContent) responseContent.innerHTML = parseMarkdown(data.message.content);
      
      state._streamBubbleEl = null;
      state._streamText = "";
      state._thoughtText = "";
      state._thoughtSteps = [];
      
      if (window.parent) {
        state.unreadCount++;
        window.parent.postMessage({ type: 'UNREAD_COUNT', version: PROTO_VERSION, payload: { count: state.unreadCount } }, state.parentOrigin || '*');
      }
    } else {
      typeMessage(data.message.content);
    }
  });

  socket.off('ai_stream_chunk');
  socket.on('ai_stream_chunk', (data: any) => {
    if (data.conversationId !== state.chatId) return;
    removeTypingDots();
    
    if (!state._streamBubbleEl) {
      state._streamBubbleEl = document.createElement('div');
      state._streamBubbleEl.className = 'message agent';
      state._streamBubbleEl.innerHTML = `
        <div class="message-bubble" style="min-width: 250px;">
          <div class="thought-steps" style="display: none;"></div>
          <div class="response-content md" style="display: inline;"></div>
          <div class="typing-dots-inline" style="display: none;">
            <span></span><span></span><span></span>
          </div>
          <div class="message-time"></div>
        </div>`;

      const stepsEl = state._streamBubbleEl.querySelector('.thought-steps');
      if (stepsEl) {
        stepsEl.addEventListener('click', function(event) {
          const target = event.target;
          if (!(target instanceof Element)) return;
          const toggle = target.closest('.thought-step-toggle');
          if (!toggle) return;

          const idx = toggle.getAttribute('data-step-index');
          const stepEl = stepsEl.querySelector(`.thought-step.completed[data-step-index="${idx}"]`);
          if (!stepEl) return;

          const isOpen = stepEl.classList.contains('open');
          stepEl.classList.toggle('open', !isOpen);
          toggle.setAttribute('aria-expanded', String(!isOpen));
        });
      }
      elements.messagesContainer?.appendChild(state._streamBubbleEl);
    }
    
    const stepsEl = state._streamBubbleEl.querySelector('.thought-steps');
    const responseContent = state._streamBubbleEl.querySelector('.response-content');
    const inlineDots = state._streamBubbleEl.querySelector('.typing-dots-inline') as HTMLElement;
    
    if (data.isThought) {
      state._thoughtText += data.chunk;
      state._thoughtSteps = extractThoughtSteps(state._thoughtText);
      const thinkingIndex = Math.max(0, state._thoughtSteps.length - 1);
      if (stepsEl) renderThoughtSteps(stepsEl, state._thoughtSteps, thinkingIndex);
      if (inlineDots) inlineDots.style.display = 'none';
    } else {
      state._streamText += data.chunk;
      if (stepsEl) renderThoughtSteps(stepsEl, state._thoughtSteps, -1);
      if (responseContent) responseContent.innerHTML = parseMarkdown(state._streamText);
      if (inlineDots) inlineDots.style.display = 'inline-flex';
    }
    
    const timeContainer = state._streamBubbleEl.querySelector('.message-time');
    if (timeContainer && !timeContainer.textContent) {
      timeContainer.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    scrollToBottom();
  });

  socket.off('agent_typing');
  socket.on('agent_typing', (data: any) => {
    if (data.conversationId === state.chatId) showTyping();
  });

  socket.off('agent_stopped_typing');
  socket.on('agent_stopped_typing', (data: any) => {
    if (data.conversationId === state.chatId) hideTyping();
  });

  socket.off('conversation_escalated');
  socket.on('conversation_escalated', (data: any) => {
    if (data.conversationId !== state.chatId) return;
    removeTypingDots();
    clearOutcomePanel();
    setComposerEnabled(true, data.agent?.name ? `Reply to ${data.agent.name}...` : 'Reply to support...');
    if (data.agent?.name) {
      state._escalationShown = true;
      const name = data.agent.name;
      showStateBanner('human', 'Live human support connected', `You are now chatting with ${name}`);
      addSystemNotice(`👋 ${name} joined the conversation and will assist you directly.`);
    }
  });

  socket.off('message_sent');
  socket.on('message_sent', () => {
    if (elements.sendBtn) elements.sendBtn.disabled = false;
  });

  socket.off('status_updated');
  socket.on('status_updated', (data: any) => {
    if (data.conversationId?.toString() !== state.chatId?.toString()) return;
    const status = data.status;

    if (status === 'resolved' || status === 'closed') {
      addSystemNotice(status === 'resolved' ? '✅ This conversation has been resolved' : '🔒 This conversation has been closed');
      showStateBanner(status === 'resolved' ? 'resolved' : 'closed', status === 'resolved' ? 'Conversation resolved' : 'Conversation closed', 'Start a new chat if you need more help');
      setComposerEnabled(false, status === 'resolved' ? 'Conversation resolved. Start a new chat.' : 'Conversation closed. Start a new chat.');
      showOutcomePanel(status === 'resolved' ? 'resolved' : 'closed');
    } else if (status === 'pending') {
      showStateBanner('pending', 'Waiting for support team', 'Your chat is in queue. We will be with you shortly.');
      addSystemNotice("⏳ Your query is pending review — we'll be right with you");
    } else if (status === 'open') {
      clearOutcomePanel();
      setComposerEnabled(true, state._escalationShown ? 'Reply to your support agent...' : 'Type your message...');
      if (state._escalationShown) {
        showStateBanner('human', 'Live human support connected');
      } else {
        removeStateBanner();
      }
      addSystemNotice('🔄 This conversation has been reopened');
    }
  });
}
