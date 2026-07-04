import { io } from "socket.io-client";
import { state, API_BASE_URL } from './config';
import { elements, addMessage, addSystemNotice, typeMessage, removeTypingDots, scrollToBottom, showTyping, hideTyping, showAgentConnectedCard, renderAgentResponseIcon, createToolStepsPanel, addToolStep, completeToolStep, removeToolStepsPanel } from './ui';
import { parseMarkdown } from './utils/markdown';

let authRetryCount = 0;
const MAX_AUTH_RETRIES = 3;
const STREAM_BOUNDARY_FLUSH_MS = 400;
const STREAM_SENTENCE_MIN_CHARS = 40;
const STREAM_LONG_PARAGRAPH_CHARS = 160;
const STREAM_IDLE_WORD_FLUSH_CHARS = 20;

type ConversationVisualState = 'human' | 'closed' | 'pending' | 'open';

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

function clearStreamFlushTimer() {
  if (!state._streamFlushTimer) return;
  clearTimeout(state._streamFlushTimer as number);
  state._streamFlushTimer = null;
}

function resetStreamState() {
  clearStreamFlushTimer();
  state._streamBubbleEl = null;
  state._streamText = "";
  state._streamRenderedText = "";
  setAiResponding(false);
}

// Track the current tool step element so we can complete it
let _currentToolStepEl: HTMLElement | null = null;

function getNextStreamFlushText(force = false) {
  if (force) return state._streamText;

  const renderedLength = state._streamRenderedText.length;
  const pending = state._streamText.slice(renderedLength);
  if (!pending) return state._streamRenderedText;

  const paragraphMatch = pending.match(/\n\s*\n/);
  if (paragraphMatch?.index !== undefined) {
    const end = renderedLength + paragraphMatch.index + paragraphMatch[0].length;
    return state._streamText.slice(0, end);
  }

  if (pending.length >= STREAM_SENTENCE_MIN_CHARS) {
    const sentenceMatches = Array.from(pending.matchAll(/[.!?]["')\]]?\s+/g));
    const lastSentence = sentenceMatches[sentenceMatches.length - 1];
    if (lastSentence?.index !== undefined) {
      const end = renderedLength + lastSentence.index + lastSentence[0].length;
      return state._streamText.slice(0, end);
    }
  }

  if (pending.length >= STREAM_LONG_PARAGRAPH_CHARS) {
    const lastSpace = pending.lastIndexOf(' ');
    const end = renderedLength + (lastSpace > 0 ? lastSpace + 1 : pending.length);
    return state._streamText.slice(0, end);
  }

  return state._streamRenderedText;
}

function getIdleStreamFlushText() {
  const boundaryText = getNextStreamFlushText(false);
  if (boundaryText !== state._streamRenderedText) return boundaryText;

  const renderedLength = state._streamRenderedText.length;
  const pending = state._streamText.slice(renderedLength);
  if (pending.length < STREAM_IDLE_WORD_FLUSH_CHARS) return state._streamRenderedText;

  const lastSpace = pending.lastIndexOf(' ');
  if (lastSpace <= 0) return state._streamRenderedText;
  return state._streamText.slice(0, renderedLength + lastSpace + 1);
}

function renderStreamingText(text: string): string {
  // During streaming, render plain text only — no markdown parsing.
  // Running the full markdown parser on partial chunks causes regex
  // patterns (bold, italic, lists) to partially match mid-word and
  // reorder/scramble text until the next chunk arrives and "fixes" it.
  // The full parseMarkdown() is called on stream_end with the complete text.
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\n/g, '<br>');
}

function flushStreamContent(force = false, idle = false) {
  if (!state._streamBubbleEl) return;

  const nextText = idle && !force ? getIdleStreamFlushText() : getNextStreamFlushText(force);
  if (nextText === state._streamRenderedText && !force) return;

  state._streamRenderedText = nextText;
  const responseContent = state._streamBubbleEl.querySelector('.response-content');

  // Use plain-text rendering during streaming to prevent mid-stream word scrambling.
  // stream_end will replace this with the fully parsed markdown output.
  if (responseContent) responseContent.innerHTML = renderStreamingText(state._streamRenderedText);

  scrollToBottom();
}

function scheduleStreamFlush() {
  clearStreamFlushTimer();
  state._streamFlushTimer = setTimeout(() => {
    state._streamFlushTimer = null;
    flushStreamContent(false, true);
    if (state._streamRenderedText !== state._streamText) scheduleStreamFlush();
  }, STREAM_BOUNDARY_FLUSH_MS) as unknown as number;
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

    try {
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
        const responseContent = state._streamBubbleEl.querySelector('.response-content');
        if (responseContent) responseContent.innerHTML = parseMarkdown(data.message.content);

        removeTypingDots();
        hideTyping();
        removeToolStepsPanel();
        resetStreamState();
      } else if (state._toolStepsEl) {
        // Tool steps panel exists but no stream bubble — replace with final answer
        removeToolStepsPanel();
        removeTypingDots();
        hideTyping();
        typeMessage(data.message.content);
      } else {
        removeTypingDots();
        hideTyping();
        typeMessage(data.message.content);
      }
    } finally {
      // new_message is the completion signal for both streamed and regular replies.
      setAiResponding(false);
    }
  });

  socket.off('ai_stream_chunk');
  socket.on('ai_stream_chunk', (data: any) => {
    if (data.conversationId !== state.chatId) return;

    // ── Handle tool events ────────────────────────────────────────────────
    if (data.toolEvent) {
      const ev = data.toolEvent;

      if (ev.type === "start") {
        if (!state._toolStepsEl) {
          removeTypingDots();
          hideTyping();
          setAiResponding(true);

          // Create the collapsible tool-call-block
          const block = createToolStepsPanel();
          elements.messagesContainer?.appendChild(block);
          state._toolStepsEl = block;
        }

        _currentToolStepEl = addToolStep(state._toolStepsEl, ev.label);
        scrollToBottom();
        return;
      }

      if (ev.type === "complete" && _currentToolStepEl) {
        completeToolStep(_currentToolStepEl, ev.detail);
        _currentToolStepEl = null;
        scrollToBottom();
        return;
      }

      return;
    }

    // ── Handle text streaming ─────────────────────────────────────────────
    if (!state._streamBubbleEl) {
      // First text chunk — remove skeleton/steps panel and create stream bubble
      removeTypingDots();
      hideTyping();

      // If tool steps panel exists, remove it — the final answer replaces it
      if (state._toolStepsEl) {
        removeToolStepsPanel();
      }

      setAiResponding(true);

      state._streamBubbleEl = document.createElement('div');
      state._streamBubbleEl.className = 'message agent';
      state._streamBubbleEl.innerHTML = `
        ${renderAgentResponseIcon()}
        <div class="message-bubble" style="min-width: 250px;">
          <div class="response-content md"></div>
          <div class="message-time"></div>
        </div>`;

      elements.messagesContainer?.appendChild(state._streamBubbleEl);
    }

    // Thought chunks are discarded — never shown to the user
    if (!data.isThought && data.chunk) {
      state._streamText += data.chunk;
      flushStreamContent(false);
      if (state._streamRenderedText !== state._streamText) scheduleStreamFlush();
    }

    const timeContainer = state._streamBubbleEl.querySelector('.message-time');
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
    setComposerEnabled(true, data.agent?.name ? `Reply to ${data.agent.name}...` : 'Reply to support...');
    if (data.agent?.name) {
      state._escalationShown = true;
      const name = data.agent.name;
      showStateBanner('human', 'Live human support connected', `You are now chatting with ${name}`);
      showAgentConnectedCard(name);
      // Show agent default welcome message after a short delay
      setTimeout(() => {
        addMessage(`Hi! I'm ${name}. I'll be helping you from here — feel free to share what you need! 😊`, 'agent', name, 'text');
      }, 800);
    } else {
      state._escalationShown = true;
      showStateBanner('human', 'Live human support connected');
      addSystemNotice('👋 A support agent has joined and will assist you shortly.');
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

    if (status === 'closed') {
      addSystemNotice('🔒 This conversation has been closed');
      showStateBanner('closed', 'Conversation closed', 'Start a new chat if you need more help');
      setComposerEnabled(false, 'Conversation closed. Start a new chat.');
      showOutcomePanel();
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
    } else if (status === 'resolved') {
      clearOutcomePanel();
      setComposerEnabled(true, state._escalationShown ? 'Reply to your support agent...' : 'Type your message...');
      if (state._escalationShown) {
        showStateBanner('human', 'Live human support connected');
      } else {
        removeStateBanner();
      }
    }
  });
}
