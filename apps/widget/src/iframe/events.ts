import { state, API_BASE_URL, PROTO_VERSION } from './config';
import { elements, addMessage, adjustTextareaHeight, hideWelcomeScreen, showTypingDots, removeTypingDots, formatHistoryDateTime, scrollToBottom } from './ui';
import { makeAuthenticatedRequest, fetchMessagesFromBackend, uploadAndSendFile } from './api';
import { initializeSocket } from './socket';

function clearWidgetStateChrome() {
  document.getElementById('conversationStateBanner')?.remove();
  document.getElementById('conv-closed-banner')?.remove();
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

  if (elements.attachBtn) elements.attachBtn.disabled = !enabled;
}

function showStateBanner(stateType: 'human' | 'resolved' | 'closed', title: string, subtitle?: string) {
  const topbar = document.querySelector('.widget-topbar');
  if (!topbar) return;

  let banner = document.getElementById('conversationStateBanner');
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

function showOutcomePanel(status: 'resolved' | 'closed') {
  const messagesContainer = elements.messagesContainer;
  if (!messagesContainer) return;

  document.getElementById('conv-closed-banner')?.remove();

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
  document.getElementById('bannerNewChatBtn')?.addEventListener('click', startNewConversation, { once: true });
}

function applyConversationVisualStateFromHistory(conversation: any) {
  const status = (conversation?.status || 'open').toLowerCase();

  if (status === 'resolved' || status === 'closed') {
    showStateBanner(status === 'resolved' ? 'resolved' : 'closed', status === 'resolved' ? 'Conversation resolved' : 'Conversation closed', 'Start a new chat if you need more help');
    setComposerEnabled(false, status === 'resolved' ? 'Conversation resolved. Start a new chat.' : 'Conversation closed. Start a new chat.');
    showOutcomePanel(status === 'resolved' ? 'resolved' : 'closed');
    return;
  }

  if (state._escalationShown) {
    const agent = conversation?.assignedAgent || conversation?.assignedTo;
    const name = typeof agent === 'object' && agent?.name ? agent.name : 'a support agent';
    showStateBanner('human', 'Live human support connected', `You are now chatting with ${name}`);
    setComposerEnabled(true, `Reply to ${name}...`);
    return;
  }

  setComposerEnabled(true, 'Type your message...');
}

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
    // Open history
    elements.historyBtn.addEventListener('click', async () => {
      elements.historyOverlay!.style.display = 'flex';
      renderHistoryList([]);
      renderHistoryLoading();
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/v1/widget/conversations?sessionId=${encodeURIComponent(state.currentSessionId || '')}`,
          { headers: { 'Authorization': `Bearer ${state.widgetToken}` } }
        );
        if (!res.ok) throw new Error('Failed');
        const data = await res.json();
        const convs: any[] = data.data?.conversations || [];
        state._historyCached = convs;
        renderHistoryList(convs);
      } catch {
        renderHistoryError();
      }
    });

    // Close / back
    elements.closeHistoryBtn.addEventListener('click', () => {
      elements.historyOverlay!.style.display = 'none';
      if (elements.historySearch) elements.historySearch.value = '';
    });

    // Search filter
    elements.historyOverlay.addEventListener('input', (e) => {
      const target = e.target as HTMLElement;
      if (target.id !== 'historySearch') return;
      const q = (target as HTMLInputElement).value.toLowerCase().trim();
      const convs: any[] = state._historyCached || [];
      renderHistoryList(q ? convs.filter((c) => {
        const preview = (c.lastMessage?.content || c.lastMessage || '').toLowerCase();
        return preview.includes(q);
      }) : convs);
    });

    // New conversation
    elements.historyOverlay.addEventListener('click', (e) => {
      const btn = (e.target as Element).closest('#newConversationBtn');
      if (!btn) return;
      startNewConversation();
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

// ── History helpers ────────────────────────────────────────────────────

function renderHistoryLoading() {
  if (!elements.historyList) return;
  elements.historyList.innerHTML = `
    <div class="history-state">
      <div class="history-state-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
      </div>
      Loading conversations…
    </div>`;
}

function renderHistoryError() {
  if (!elements.historyList) return;
  elements.historyList.innerHTML = `
    <div class="history-state" style="color:#ef4444;">
      <div class="history-state-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      </div>
      Failed to load — try again
    </div>`;
}

function renderHistoryList(convs: any[]) {
  if (!elements.historyList) return;

  if (convs.length === 0) {
    elements.historyList.innerHTML = `
      <div class="history-state">
        <div class="history-state-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        </div>
        No conversations yet
      </div>`;
    return;
  }

  elements.historyList.innerHTML = '';

  convs.forEach((c: any, idx: number) => {
    const msg: string = (c.lastMessage?.content || c.lastMessage || 'No messages').trim();
    const preview = msg.length > 100 ? msg.substring(0, 100) + '…' : msg;
    // Use first meaningful text as "title"
    const titleRaw = c.subject || msg;
    const title = titleRaw.length > 48 ? titleRaw.substring(0, 48) + '…' : titleRaw;
    const status = (c.status || 'open').toLowerCase();
    const statusClass = status === 'closed' || status === 'resolved' ? `status-${status}` : 'status-open';
    const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);
    const lastUpdated = formatHistoryDateTime(c.updatedAt || c.createdAt);

    const el = document.createElement('div');
    el.className = 'history-item';
    el.style.animationDelay = `${idx * 40}ms`;
    el.innerHTML = `
      <div class="history-item-top">
        <div class="history-item-title">${escapeHtmlInline(title)}</div>
        <div class="history-item-status ${statusClass}">${statusLabel}</div>
      </div>
      <div class="history-item-preview">${escapeHtmlInline(preview)}</div>
      <div class="history-item-meta">
        <div class="history-item-date">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          ${lastUpdated}
        </div>
        <div class="history-item-arrow">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </div>
      </div>`;

    el.addEventListener('click', () => {
      state.chatId = c._id || c.id;
      clearWidgetStateChrome();
      elements.historyOverlay!.style.display = 'none';
      if (elements.historySearch) (elements.historySearch as any).value = '';
      elements.messagesContainer!.innerHTML = `
        <div class="history-state">
          <div class="history-state-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
          </div>
          Loading chat…
        </div>`;
      hideWelcomeScreen();
      state.isConnected = true;
      if (state.socket) state.socket.emit('join_conversation', state.chatId);

      // Restore escalation badge if this conversation was escalated to a human agent
      restoreEscalationBadge(c);

      fetchMessagesFromBackend(state.chatId as string).then((msgs: any[]) => {
        elements.messagesContainer!.innerHTML = '';
        msgs.forEach((m: any) => addMessage(m.content, m.sender === 'visitor' ? 'user' : 'agent', 'Support', 'text'));
        applyConversationVisualStateFromHistory(c);
        scrollToBottom();
      });
    });

    elements.historyList!.appendChild(el);
  });
}

function startNewConversation() {
  // Close history overlay
  if (elements.historyOverlay) elements.historyOverlay.style.display = 'none';
  const searchEl = document.getElementById('historySearch') as HTMLInputElement | null;
  if (searchEl) searchEl.value = '';

  clearWidgetStateChrome();

  // Reset conversation state so next message creates a fresh conversation
  state.chatId = null;
  state.isConnected = false;
  state._historyCached = [];
  state._escalationShown = false;
  state._streamBubbleEl = null;
  state._streamText = '';
  state._thoughtText = '';
  state._thoughtSteps = [];

  // Hide agent badge
  const agentBadge = document.getElementById('agentBadge');
  if (agentBadge) agentBadge.style.display = 'none';

  // Show welcome screen, hide messages
  if (elements.messagesContainer) {
    elements.messagesContainer.innerHTML = '';
    elements.messagesContainer.style.display = 'none';
  }
  const welcomeScreen = document.getElementById('welcomeScreen');
  if (welcomeScreen) welcomeScreen.style.display = 'flex';

  // Focus input
  setComposerEnabled(true, 'Type your message...');
  if (elements.messageInput) {
    elements.messageInput.value = '';
    elements.messageInput.focus();
  }
}

/**
 * Restore the agent badge UI when opening a previously-escalated conversation
 * from the history list. Checks the assignedAgent field from the conversation
 * record returned by the API.
 */
function restoreEscalationBadge(conversation: any) {
  // Support both populated objects and plain string IDs
  const agent = conversation.assignedAgent || conversation.assignedTo;

  if (agent && typeof agent === 'object' && agent.name) {
    state._escalationShown = true;
  } else {
    state._escalationShown = false;
  }
}

/** Simple HTML escape for inline use without importing from ui.ts */
function escapeHtmlInline(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
