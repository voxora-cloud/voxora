import { state, API_BASE_URL, PROTO_VERSION } from './config';
import { elements, addMessage, adjustTextareaHeight, hideWelcomeScreen, showTypingDots, removeTypingDots, formatHistoryDateTime, scrollToBottom } from './ui';
import { makeAuthenticatedRequest, fetchMessagesFromBackend, uploadAndSendFile } from './api';
import { initializeSocket } from './socket';

export function setupEventListeners() {
  if (elements.messageInput) {
    elements.messageInput.addEventListener("input", function (this: HTMLTextAreaElement) {
      adjustTextareaHeight();
      if (elements.sendBtn) elements.sendBtn.disabled = !this.value.trim();
      handleTypingChanged(this.value);
    });

    elements.messageInput.addEventListener("keydown", function (e: KeyboardEvent) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    elements.messageInput.addEventListener('blur', () => {
      typingStop();
    });
  }

  if (elements.sendBtn) {
    elements.sendBtn.addEventListener("click", sendMessage);
  }

  if (elements.attachBtn && elements.fileInput) {
    elements.attachBtn.addEventListener('click', () => elements.fileInput.click());
    elements.fileInput.addEventListener('change', function(this: HTMLInputElement) {
      if (this.files && this.files[0]) {
        uploadAndSendFile(this.files[0]);
        this.value = '';
      }
    });
  }

  if (elements.historyBtn && elements.historyOverlay && elements.closeHistoryBtn) {
    elements.historyBtn.addEventListener("click", async () => {
      elements.historyOverlay!.style.display = 'flex';
      if (elements.historyList) {
        elements.historyList.innerHTML = '<div class="history-state">Loading conversations...</div>';
        try {
          const res = await fetch(`${API_BASE_URL}/api/v1/widget/conversations?sessionId=${encodeURIComponent(state.currentSessionId || '')}`, {
            headers: { 'Authorization': `Bearer ${state.widgetToken}` }
          });
          if (!res.ok) throw new Error("Failed");
          const data = await res.json();
          const convs = data.data?.conversations || [];
          if (convs.length === 0) {
            elements.historyList.innerHTML = '<div class="history-state">No recent conversations yet</div>';
            return;
          }
          elements.historyList.innerHTML = '';
          convs.forEach((c: any) => {
            const el = document.createElement('div');
            el.className = 'history-item';
            const msg = c.lastMessage?.content || c.lastMessage || 'No messages';
            const status = (c.status || 'open').toLowerCase();
            const statusClass = status === 'closed' || status === 'resolved' ? `status-${status}` : 'status-open';
            const lastUpdated = formatHistoryDateTime(c.updatedAt || c.createdAt);
            el.innerHTML = `<div class="history-item-preview">${msg.length > 72 ? msg.substring(0, 72) + '...' : msg}</div><div class="history-item-meta"><div class="history-item-date">${lastUpdated}</div><div class="history-item-status ${statusClass}">${status}</div></div>`;
            
            el.addEventListener('click', () => {
              state.chatId = c._id || c.id;
              elements.historyOverlay!.style.display = 'none';
              elements.messagesContainer!.innerHTML = '<div class="history-state">Loading chat...</div>';
              hideWelcomeScreen();
              state.isConnected = true;
              if (state.socket) state.socket.emit('join_conversation', state.chatId);
              fetchMessagesFromBackend(state.chatId as string).then(msgs => {
                elements.messagesContainer!.innerHTML = '';
                msgs.forEach((m: any) => addMessage(m.content, m.sender === 'visitor' ? 'user' : 'agent', 'Support', "text"));
                scrollToBottom();
              });
            });
            elements.historyList!.appendChild(el);
          });
        } catch (err) {
          elements.historyList.innerHTML = '<div class="history-state" style="color:#ef4444;">Failed to load history</div>';
        }
      }
    });
    
    elements.closeHistoryBtn.addEventListener("click", () => {
      elements.historyOverlay!.style.display = 'none';
    });
  }

  if (elements.suggestionsContainer && elements.messageInput) {
    elements.suggestionsContainer.addEventListener('click', (e) => {
      const btn = (e.target as Element).closest('.suggestion-btn') as HTMLButtonElement | null;
      if (btn && btn.dataset.text) {
        elements.messageInput.value = btn.dataset.text;
        elements.messageInput.focus();
        if (elements.sendBtn) elements.sendBtn.disabled = false;
      }
    });
  }

  document.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Escape' && window.parent) {
      window.parent.postMessage({ type: 'CLOSE_WIDGET', version: PROTO_VERSION }, state.parentOrigin || '*');
    }
  });
}

function getPageContext(): Promise<string> {
  const domAccessEnabled = state._uiConfig && state._uiConfig.features && state._uiConfig.features.endUserDomAccess;
  if (!domAccessEnabled) return Promise.resolve('');

  return new Promise(function(resolve) {
    const timeout = setTimeout(function() {
      window.removeEventListener('message', handler);
      const parts = [];
      if ((window as any).__voxoraPageUrl)   parts.push('Page URL: '   + (window as any).__voxoraPageUrl);
      if ((window as any).__voxoraPageTitle) parts.push('Page Title: ' + (window as any).__voxoraPageTitle);
      resolve(parts.length ? '\\n\\n[PAGE_CONTEXT]\\n' + parts.join('\\n') : '');
    }, 600);

    function handler(event: MessageEvent) {
      if (!event.data || event.data.type !== 'PAGE_HTML_RESPONSE') return;
      clearTimeout(timeout);
      window.removeEventListener('message', handler);
      const html = (event.data.payload && event.data.payload.html) || '';
      const parts = [];
      if ((window as any).__voxoraPageUrl)   parts.push('Page URL: '   + (window as any).__voxoraPageUrl);
      if ((window as any).__voxoraPageTitle) parts.push('Page Title: ' + (window as any).__voxoraPageTitle);
      if (html)                     parts.push('Page HTML:\\n' + html);
      resolve(parts.length ? '\\n\\n[PAGE_CONTEXT]\\n' + parts.join('\\n') : '');
    }

    window.addEventListener('message', handler);
    if (window.parent) {
      window.parent.postMessage({ type: 'REQUEST_PAGE_HTML', version: PROTO_VERSION }, '*');
    }
  });
}

async function sendMessage() {
  if (!elements.messageInput) return;
  const text = elements.messageInput.value.trim();
  if (!text) return;

  if (!state.widgetToken) {
    console.warn('[VoxoraWidget] sendMessage called before token ready — ignoring');
    return;
  }

  hideWelcomeScreen();
  addMessage(text, "user", state.userName || "You", "text");
  elements.messageInput.value = "";
  adjustTextareaHeight();
  if (elements.sendBtn) elements.sendBtn.disabled = true;
  
  if (!state._escalationShown) showTypingDots();

  if (!state.chatId) {
    try {
      const pageContext = await getPageContext();
      const data = {
        visitorName: state.userName || undefined,
        visitorEmail: state.userEmail || undefined,
        message: text + pageContext,
        voxoraPublicKey: state.voxoraPublicKey,
        sessionId: state.currentSessionId,
      };

      const response = await makeAuthenticatedRequest(`${API_BASE_URL}/api/v1/widget/conversations`, {
        method: "POST",
        body: JSON.stringify(data),
      });

      if (response.ok) {
        const result = await response.json();
        state.chatId = result.data.conversationId;
        state.userName = data.visitorName || "";
        state.userEmail = data.visitorEmail || "";
        state.isConnected = true;

        if (!state.socket && state.widgetToken) {
          initializeSocket();
        }

        if (state.socket) {
          state.socket.emit('join_conversation', state.chatId);
          state.socket.emit('send_message', {
            conversationId: state.chatId,
            content: text + pageContext,
            type: 'text',
            metadata: { senderName: state.userName, senderEmail: state.userEmail, source: 'widget' }
          });
          typingStop();
        }

        setTimeout(() => { if (elements.sendBtn) elements.sendBtn.disabled = false; }, 1000);
      } else {
        removeTypingDots();
        throw new Error("Failed to create conversation");
      }
    } catch (error) {
      removeTypingDots();
      console.error("Error creating conversation:", error);
      if (elements.sendBtn) elements.sendBtn.disabled = false;
    }
    return;
  }

  if (state.socket && state.chatId) {
    const pageContext = await getPageContext();
    state.socket.emit('send_message', {
      conversationId: state.chatId,
      content: text + pageContext,
      type: 'text',
      metadata: { senderName: state.userName, senderEmail: state.userEmail, source: 'widget' }
    });
    typingStop();
    setTimeout(() => { if (elements.sendBtn) elements.sendBtn.disabled = false; }, 1000);
  } else {
    if (elements.sendBtn) elements.sendBtn.disabled = false;
  }
}

function typingStart() {
  if (!state.socket || !state.chatId) return;
  if (!state.isTyping) {
    state.socket.emit('typing_start', { conversationId: state.chatId });
    state.isTyping = true;
  }
  if (state.typingTimeout) clearTimeout(state.typingTimeout);
  state.typingTimeout = setTimeout(typingStop, 1500) as unknown as number;
}

function typingStop() {
  if (!state.socket || !state.chatId) return;
  if (state.isTyping) {
    state.socket.emit('typing_stop', { conversationId: state.chatId });
    state.isTyping = false;
  }
  if (state.typingTimeout) {
    clearTimeout(state.typingTimeout);
    state.typingTimeout = null;
  }
}

function handleTypingChanged(val: string) {
  if (!val || !val.trim()) {
    typingStop();
  } else {
    typingStart();
  }
}
