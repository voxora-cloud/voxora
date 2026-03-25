import { io } from "socket.io-client";
import { state, API_BASE_URL, PROTO_VERSION } from './config';
import { elements, addMessage, addSystemNotice, typeMessage, removeTypingDots, scrollToBottom, showTyping, hideTyping, renderThoughtSteps } from './ui';
import { extractThoughtSteps, parseMarkdown } from './utils/markdown';

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
    }
  });

  bindSocketEvents();
}

function bindSocketEvents() {
  if (!state.socket) return;
  const socket = state.socket;

  socket.on('connect', () => {
    console.log('Socket connected for widget user with ID:', socket.id);
    if (state.chatId) {
      socket.emit('join_conversation', state.chatId);
    }
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected');
  });

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

  socket.on('agent_typing', (data: any) => {
    if (data.conversationId === state.chatId) showTyping();
  });

  socket.on('agent_stopped_typing', (data: any) => {
    if (data.conversationId === state.chatId) hideTyping();
  });

  socket.off('conversation_escalated');
  socket.on('conversation_escalated', (data: any) => {
    if (data.conversationId !== state.chatId) return;
    removeTypingDots();
    if (elements.sendBtn) elements.sendBtn.disabled = false;
    if (data.agent?.name) {
      state._escalationShown = true;
      const name = data.agent.name;
      const initials = name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
      const agentBadgeInitial = document.getElementById('agentBadgeInitial');
      const agentBadgeName = document.getElementById('agentBadgeName');
      const agentBadge = document.getElementById('agentBadge');
      if (agentBadgeInitial) agentBadgeInitial.textContent = initials;
      if (agentBadgeName) agentBadgeName.textContent = name;
      if (agentBadge) agentBadge.style.display = 'flex';
    }
  });

  socket.on('message_sent', () => {
    if (elements.sendBtn) elements.sendBtn.disabled = false;
  });

  socket.off('status_updated');
  socket.on('status_updated', (data: any) => {
    if (data.conversationId?.toString() !== state.chatId?.toString()) return;
    const status = data.status;
    const inputArea = document.querySelector('.input-area') as HTMLElement;

    if (status === 'resolved' || status === 'closed') {
      addSystemNotice(status === 'resolved' ? '✅ This conversation has been resolved' : '🔒 This conversation has been closed');
      if (inputArea && !document.getElementById('conv-closed-banner')) {
        inputArea.style.display = 'none';
        const banner = document.createElement('div');
        banner.className = 'conv-closed-banner';
        banner.id = 'conv-closed-banner';
        banner.innerHTML =
          '<span class="banner-icon">' + (status === 'resolved' ? '✅' : '🔒') + '</span>' +
          '<span class="banner-title">' + (status === 'resolved' ? 'Conversation resolved' : 'Conversation closed') + '</span>' +
          '<span class="banner-sub">Start a new chat if you have more questions</span>' +
          '<button class="banner-new-btn" id="bannerNewChatBtn">Start new chat</button>';
        inputArea.parentNode?.insertBefore(banner, inputArea.nextSibling);
        
        document.getElementById('bannerNewChatBtn')?.addEventListener('click', () => {
          banner.remove();
          inputArea.style.display = '';
          if (elements.messagesContainer) elements.messagesContainer.innerHTML = '';
          state.chatId = null;
          state.isConnected = false;
          state._escalationShown = false;
          const agentBadge = document.getElementById('agentBadge');
          if (agentBadge) agentBadge.style.display = 'none';
          if (elements.messageInput) {
            elements.messageInput.disabled = false;
            elements.messageInput.placeholder = 'Type your message...';
            elements.messageInput.focus();
          }
          if (elements.sendBtn) elements.sendBtn.disabled = true;
          setTimeout(() => addMessage('Hi there! 👋', 'agent', 'Support Team'), 150);
        });
      }
    } else if (status === 'pending') {
      addSystemNotice("⏳ Your query is pending review — we'll be right with you");
    } else if (status === 'open') {
      const banner = document.getElementById('conv-closed-banner');
      if (banner) { banner.remove(); if(inputArea) inputArea.style.display = ''; }
      if (elements.messageInput) elements.messageInput.disabled = false;
      if (elements.sendBtn && elements.messageInput) elements.sendBtn.disabled = !elements.messageInput.value.trim();
      addSystemNotice('🔄 This conversation has been reopened');
    }
  });
}
