import { io } from "socket.io-client";
import { state, API_BASE_URL } from './config';
import { elements, addMessage, addSystemNotice, typeMessage, removeTypingDots, scrollToBottom, showTyping, hideTyping, showAgentConnectedCard, renderAgentResponseIcon, createToolStepsPanel, addToolStep, completeToolStep, removeToolStepsPanel } from './ui';
import { parseMarkdown, parseStreamingMarkdown } from './utils/markdown';

let authRetryCount = 0;
const MAX_AUTH_RETRIES = 3;

type ConversationVisualState = 'human' | 'closed' | 'pending' | 'open' | 'resolved';

export function setAiResponding(responding: boolean) {
  state._aiResponding = responding;
  const inputArea = document.querySelector('.input-area') as HTMLElement | null;
  if (inputArea) inputArea.classList.toggle('is-disabled', responding);
  if (elements.messageInput) {
    elements.messageInput.disabled = responding;
    if (responding) {
      elements.messageInput.placeholder = 'AI is responding...';
    } else {
      elements.messageInput.placeholder = 'Type your message...';
    }
  }
  if (elements.sendBtn) {
    elements.sendBtn.disabled = responding || !elements.messageInput?.value.trim();
  }
}


function getStateBanner(): HTMLElement | null {
  return document.getElementById('conversationStateBanner');
}

function resetStreamState() {
  state._streamBubbleEl = null;
  state._streamMessageId = null;
  setAiResponding(false);
}

// Track the current tool step element so we can complete it
let _currentToolStepEl: HTMLElement | null = null;

function releaseToolSteps() {
  if (state._toolStepsEl) {
    const title = state._toolStepsEl.querySelector('.tool-call-title');
    if (title) title.textContent = 'Steps completed';
    
    // Complete any step that might still be marked as loading
    const activeSteps = state._toolStepsEl.querySelectorAll('.tool-step.is-loading');
    activeSteps.forEach(step => {
      step.classList.remove('is-loading');
      step.classList.add('is-done');
    });
  }
  state._toolStepsEl = null;
  _currentToolStepEl = null;
}

function findToolStepsPanel(messageId: string): HTMLElement | null {
  const panels = elements.messagesContainer?.querySelectorAll<HTMLElement>('.tool-call-block');
  return Array.from(panels || []).find(
    (panel) => panel.dataset.streamMessageId === messageId,
  ) || null;
}

function placeToolStepsBeforeResponse(panel: HTMLElement, messageId: string) {
  const container = elements.messagesContainer;
  if (!container) return;

  const agentMessages = Array.from(
    container.querySelectorAll<HTMLElement>('.message.agent'),
  );
  const response = state._streamBubbleEl
    || agentMessages.find(
      (message) => message.dataset.messageId === messageId,
    )
    || container.querySelector('.message.agent[data-status="streaming"]')
    || (
      state._completedStreamMessageIds.has(messageId)
        ? agentMessages.at(-1) || null
        : null
    );

  if (response?.parentElement === container) {
    container.insertBefore(panel, response);
  } else if (panel.parentElement !== container) {
    container.appendChild(panel);
  }
}

function createStreamingMessage(messageId: string) {
  const element = document.createElement('div');
  element.className = 'message agent';
  element.dataset.messageId = messageId;
  element.dataset.status = 'streaming';
  element.innerHTML = `
    ${renderAgentResponseIcon()}
    <div class="message-bubble" style="min-width: 250px;">
      <div class="response-content md"></div>
      <div class="message-time"></div>
    </div>`;

  const stream = {
    content: '',
    element,
    lastSequence: 0,
    status: 'streaming' as const,
  };
  state._streamMessages.set(messageId, stream);
  state._streamMessageId = messageId;
  state._streamBubbleEl = element;
  elements.messagesContainer?.appendChild(element);
  return stream;
}

function removeStateBanner() {
  const banner = getStateBanner();
  if (banner) banner.remove();
}

function getBannerIcon(stateType: ConversationVisualState): string {
  switch (stateType) {
    case 'human':
      return `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`;
    case 'pending':
      return `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`;
    case 'resolved':
      return `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;
    case 'closed':
      return `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>`;
    default:
      return '';
  }
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
  const iconHtml = getBannerIcon(stateType);

  banner.innerHTML = `
    <div class="state-banner-inner" style="display: flex; gap: 12px; align-items: flex-start;">
      ${iconHtml ? `<div class="state-icon-wrapper" style="flex-shrink: 0; margin-top: 1px;">${iconHtml}</div>` : ''}
      <div class="state-content" style="flex-grow: 1; text-align: left;">
        <div class="state-main" style="display: flex; align-items: center; gap: 8px;">
          <span class="state-title">${title}</span>
        </div>
        ${subtitle ? `<div class="state-subtitle">${subtitle}</div>` : ''}
      </div>
    </div>
  `;
}

function setComposerEnabled(enabled: boolean, placeholder?: string) {
  const inputArea = document.querySelector('.input-area') as HTMLElement | null;
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
  resetStreamState();
  state._streamMessages.clear();
  state._completedStreamMessageIds.clear();

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

function showOutcomePanel() {
  clearOutcomePanel();
  const messagesContainer = elements.messagesContainer;
  if (!messagesContainer) return;

  const panel = document.createElement('div');
  panel.className = 'conv-outcome-panel closed';
  panel.id = 'conv-closed-banner';
  panel.innerHTML = `
    <div class="outcome-icon">🔒</div>
    <div class="outcome-content">
      <div class="outcome-title">Conversation closed</div>
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
    if (err.message.includes('Authentication error') && state.InteraOnePublicKey) {
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
          body: JSON.stringify({ InteraOnePublicKey: state.InteraOnePublicKey, origin: state.parentOrigin })
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
          .catch(() => { });
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
    const finalStreamMessageId = data.streamMessageId ? String(data.streamMessageId) : null;
    if (finalStreamMessageId) {
      state._completedStreamMessageIds.add(finalStreamMessageId);
    }

    // Ensure human connection card is shown before any human message is rendered
    const isHumanMsg = data.message?.metadata?.source === 'web' || data.message?.metadata?.source === 'agent';
    if (isHumanMsg && !state._joinCardShown) {
      state._escalationShown = true;
      const name = data.message?.metadata?.senderName || 'Support Agent';
      showStateBanner('human', 'Live human support connected', `You are now chatting with ${name}`);
      showAgentConnectedCard(name);
      removeToolStepsPanel();
    }

    try {
      // Preserve the execution history, then release it for the next response.
      releaseToolSteps();

      if (data.message?.metadata?.source === 'system') {
        removeTypingDots();
        hideTyping();
        addSystemNotice(data.message.content);
        return;
      }

      if (data.message?.type === 'file' || data.message?.type === 'image') {
        removeTypingDots();
        hideTyping();
        addMessage(data.message.content, 'agent', 'Support Agent', 'file');
        return;
      }

      if (state._streamBubbleEl) {
        const streamId = finalStreamMessageId || state._streamMessageId;
        const stream = streamId ? state._streamMessages.get(streamId) : undefined;
        const responseContent = state._streamBubbleEl.querySelector('.response-content');
        if (responseContent) responseContent.innerHTML = parseMarkdown(data.message.content);
        state._streamBubbleEl.dataset.status = 'completed';
        if (stream && streamId) {
          stream.content = data.message.content;
          stream.status = 'completed';
          state._completedStreamMessageIds.add(streamId);
          state._streamMessages.delete(streamId);
        }

        removeTypingDots();
        hideTyping();
        resetStreamState();
      } else {
        removeTypingDots();
        hideTyping();
        typeMessage(data.message.content, data.message.metadata?.senderName);
      }
    } finally {
      // new_message is the completion signal for both streamed and regular replies.
      setAiResponding(false);
    }
  });

  socket.off('ai_stream_chunk');
  socket.on('ai_stream_chunk', (data: any) => {
    if (data.conversationId !== state.chatId) return;
    const streamMessageId = String(data.messageId || `conversation:${data.conversationId}`);

    // ── Handle tool events ────────────────────────────────────────────────
    if (data.toolEvent) {
      const ev = data.toolEvent;
      let panel = findToolStepsPanel(streamMessageId);

      if (!panel) {
        removeTypingDots();
        hideTyping();
        if (!state._completedStreamMessageIds.has(streamMessageId)) {
          setAiResponding(true);
        }

        panel = createToolStepsPanel();
        panel.dataset.streamMessageId = streamMessageId;
      }

      state._toolStepsEl = panel;
      placeToolStepsBeforeResponse(panel, streamMessageId);

      const sequence = Number(data.seq);
      const lastToolSequence = Number(panel.dataset.lastSequence || 0);
      if (Number.isFinite(sequence)) {
        if (sequence <= lastToolSequence) return;
        panel.dataset.lastSequence = String(sequence);
      }

      if (ev.type === "start") {
        _currentToolStepEl = addToolStep(panel, ev.label);
        scrollToBottom();
        return;
      }

      if (ev.type === "complete") {
        const step = _currentToolStepEl
          || panel.querySelector<HTMLElement>('.tool-step.is-loading')
          || addToolStep(panel, ev.label);
        if (step) {
          completeToolStep(step, ev.detail);
        }
        _currentToolStepEl = null;
        scrollToBottom();
        return;
      }

      return;
    }

    if (state._completedStreamMessageIds.has(streamMessageId)) return;

    // Empty text and thought/status events never enter the visible answer.
    if (data.isThought || typeof data.chunk !== 'string' || data.chunk.length === 0) return;

    // ── Handle text streaming ─────────────────────────────────────────────
    let stream = state._streamMessages.get(streamMessageId);
    if (!stream) {
      removeTypingDots();
      hideTyping();

      setAiResponding(true);
      stream = createStreamingMessage(streamMessageId);
    }

    // Sequence numbers make replayed/retried socket events idempotent.
    const sequence = Number(data.seq);
    if (Number.isFinite(sequence)) {
      if (sequence <= stream.lastSequence) return;
      stream.lastSequence = sequence;
    }

    stream.content += data.chunk;
    const responseContent = stream.element.querySelector('.response-content');
    if (responseContent) responseContent.innerHTML = parseStreamingMarkdown(stream.content);

    const timeContainer = stream.element.querySelector('.message-time');
    if (timeContainer && !timeContainer.textContent) {
      timeContainer.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    scrollToBottom();
  });

  socket.off('agent_typing');
  socket.on('agent_typing', (data: any) => {
    if (data.conversationId !== state.chatId) return;
    // Don't show typing dots if we're already streaming or if AI is responding
    if (state._streamBubbleEl || state._aiResponding) return;
    showTyping();
  });

  socket.off('agent_stopped_typing');
  socket.on('agent_stopped_typing', (data: any) => {
    if (data.conversationId === state.chatId) hideTyping();
  });

  socket.off('conversation_escalated');
  socket.on('conversation_escalated', (data: any) => {
    if (data.conversationId !== state.chatId) return;
    removeTypingDots();
    hideTyping();
    setAiResponding(false);
    clearOutcomePanel();
    removeToolStepsPanel();
    setComposerEnabled(true, data.agent?.name ? `Reply to ${data.agent.name}...` : 'Reply to support...');
    if (data.agent?.name) {
      state._escalationShown = true;
      const name = data.agent.name;
      showStateBanner('human', 'Live human support connected', `You are now chatting with ${name}`);
      showAgentConnectedCard(name);
    } else {
      state._escalationShown = true;
      showStateBanner('human', 'Live human support connected');
      addSystemNotice('👋 A support agent has joined and will assist you shortly.');
    }
  });

  socket.off('message_sent');
  // Delivery acknowledgement is not response completion; keep the composer
  // locked until the assistant's final new_message event arrives.

  socket.off('status_updated');
  socket.on('status_updated', (data: any) => {
    if (data.conversationId?.toString() !== state.chatId?.toString()) return;
    const status = data.status;

    if (status === 'closed') {
      addSystemNotice('🔒 This conversation has been closed');
      showStateBanner('closed', 'Conversation closed', 'Start a new chat if you need more help');
      setComposerEnabled(false, 'Conversation closed. Start a new chat.');
      showOutcomePanel();
    } else if (status === 'pending') {
      showStateBanner('pending', 'Waiting for support team', 'Your chat is in queue. We will be with you shortly.');
      addSystemNotice("⏳ Your query is pending review — we'll be right with you");
    } else if (status === 'open') {
      removeTypingDots();
      hideTyping();
      setAiResponding(false);

      // Mark as escalation active so subsequent messages do not lock the composer
      state._escalationShown = true;

      const banner = document.getElementById('conversationStateBanner');
      const wasClosedOrResolved = banner && (banner.classList.contains('state-closed') || banner.classList.contains('state-resolved'));

      clearOutcomePanel();
      showStateBanner('human', 'Connecting with support', 'Our team will be with you shortly...');
      setComposerEnabled(true, 'Reply to support...');

      if (wasClosedOrResolved) {
        addSystemNotice('🔄 This conversation has been reopened');
      }
    } else if (status === 'resolved') {
      clearOutcomePanel();
      setComposerEnabled(true, 'Type a message to reopen...');
      showStateBanner('resolved', 'Conversation resolved', 'Marked as resolved. Type to reopen.');
    }
  });
}
