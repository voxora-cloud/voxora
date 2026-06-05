import { parseMarkdown } from './utils/markdown';
import { state } from './config';
import { INTERAONE_LOGO_SVG } from '../shared/assets';
export { INTERAONE_LOGO_SVG };

// Pre-query safe DOM elements (since Vite injects script type=module at end of body)
export const elements = {
  appRoot: document.getElementById("app"),
  welcomeScreen: document.getElementById("welcomeScreen"),
  greetingTitle: document.getElementById("vx-greeting"),
  greetingSubtext: document.getElementById("vx-subtext"),
  brandAvatar: document.getElementById("vx-avatar"),
  suggestionsContainer: document.getElementById("suggestions"),
  messagesContainer: document.getElementById("messagesContainer"),
  messageInput: document.getElementById("messageInput") as HTMLTextAreaElement,
  sendBtn: document.getElementById("sendBtn") as HTMLButtonElement,
  typingIndicator: document.getElementById("typingIndicator"),
  historyBtn: document.getElementById("historyBtn"),
  historyOverlay: document.getElementById("historyOverlay"),
  closeHistoryBtn: document.getElementById("closeHistoryBtn"),
  historyList: document.getElementById("historyList"),
  historySearch: document.getElementById("historySearch") as HTMLInputElement | null,
  maximizeBtn: document.getElementById("vx-maximize"),
  minimizeBtn: document.getElementById("vx-minimize"),
  newChatBtn: document.getElementById('newChatBtn') as HTMLButtonElement | null,
  tabChat: document.getElementById('tabChat') as HTMLButtonElement | null,
  tabHistory: document.getElementById('tabHistory') as HTMLButtonElement | null,
};

let _typingDotsEl: HTMLElement | null = null;
let _agentTypingEl: HTMLElement | null = null;
let _typingDotsInterval: number | null = null;
let _openSkeletonTimer: number | null = null;

export function InteraOneLoader() {
  return `
    <div class="interaone-loader-shell" role="status" aria-label="InteraOne is thinking">
      <div class="interaone-loader" aria-hidden="true">
        <svg class="interaone-loader-mark" viewBox="0 0 200 200" focusable="false" xmlns="http://www.w3.org/2000/svg">
          <rect class="interaone-loader-bar interaone-loader-bar-1" x="50" y="90" width="10" height="40" rx="5" fill="currentColor"/>
          <rect class="interaone-loader-bar interaone-loader-bar-2" x="70" y="70" width="10" height="60" rx="5" fill="currentColor"/>
          <rect class="interaone-loader-bar interaone-loader-bar-3" x="90" y="50" width="10" height="80" rx="5" fill="currentColor"/>
          <rect class="interaone-loader-bar interaone-loader-bar-4" x="110" y="70" width="10" height="60" rx="5" fill="currentColor"/>
          <rect class="interaone-loader-bar interaone-loader-bar-5" x="130" y="90" width="10" height="40" rx="5" fill="currentColor"/>
          <circle class="interaone-loader-dot interaone-loader-dot-1" cx="75" cy="145" r="6" fill="currentColor"/>
          <circle class="interaone-loader-dot interaone-loader-dot-2" cx="100" cy="145" r="6" fill="currentColor"/>
          <circle class="interaone-loader-dot interaone-loader-dot-3" cx="125" cy="145" r="6" fill="currentColor"/>
        </svg>
      </div>
      <div class="interaone-loader-skeleton" aria-hidden="true">
        <span class="interaone-loader-skeleton-line is-primary"></span>
        <span class="interaone-loader-skeleton-line is-medium"></span>
        <span class="interaone-loader-skeleton-line is-short"></span>
      </div>
    </div>
  `;
}

export function showTypingDots(_context?: string) {
  if (_typingDotsEl) return;
  const wrapper = document.createElement('div');
  wrapper.className = 'message agent';
  wrapper.innerHTML = `<div class="message-bubble typing-bubble">${InteraOneLoader()}</div>`;
  _typingDotsEl = wrapper;
  elements.messagesContainer?.appendChild(wrapper);
  scrollToBottom();
}

export function removeTypingDots() {
  if (_typingDotsInterval) {
    window.clearInterval(_typingDotsInterval);
    _typingDotsInterval = null;
  }
  if (_typingDotsEl) {
    _typingDotsEl.remove();
    _typingDotsEl = null;
  }
}

export function showTyping() {
  if (_agentTypingEl) return;
  const wrapper = document.createElement('div');
  wrapper.className = 'message agent';
  wrapper.innerHTML = `<div class="message-bubble typing-bubble">${InteraOneLoader()}</div>`;
  _agentTypingEl = wrapper;
  elements.messagesContainer?.appendChild(wrapper);
  scrollToBottom();
}

export function hideTyping() {
  if (_agentTypingEl) {
    _agentTypingEl.remove();
    _agentTypingEl = null;
  }
}

export function showOpenSkeleton(durationMs = 1000) {
  const root = elements.appRoot as HTMLElement | null;
  if (!root) return;
  root.classList.add('is-skeleton');
  if (_openSkeletonTimer) window.clearTimeout(_openSkeletonTimer);
  _openSkeletonTimer = window.setTimeout(() => {
    root.classList.remove('is-skeleton');
    _openSkeletonTimer = null;
  }, Math.max(200, durationMs));
}

export function showAgentConnectedCard(name: string) {
  if (!elements.messagesContainer) return;
  const initial = name ? name[0].toUpperCase() : 'A';
  const card = document.createElement('div');
  card.className = 'agent-join-card';
  card.innerHTML = `
    <div class="agent-join-avatar">${initial}</div>
    <div class="agent-join-info">
      <span class="agent-join-name">${escapeHtml(name)} joined the conversation</span>
      <span class="agent-join-role"><span class="agent-join-dot"></span>Live Support</span>
    </div>
  `;
  elements.messagesContainer.appendChild(card);
  scrollToBottom();
}

export function adjustTextareaHeight() {
  if (!elements.messageInput) return;
  elements.messageInput.style.height = "auto";
  elements.messageInput.style.height = Math.min(elements.messageInput.scrollHeight, 140) + "px";
}

export function hideWelcomeScreen() {
  if (elements.welcomeScreen) elements.welcomeScreen.style.display = 'none';
  if (elements.messagesContainer) elements.messagesContainer.style.display = 'flex';
}

export function scrollToBottom() {
  if (!elements.messagesContainer) return;
  requestAnimationFrame(() => {
    elements.messagesContainer!.scrollTop = elements.messagesContainer!.scrollHeight;
  });
}

export function renderMaximizeIcon() {
  if (!elements.maximizeBtn) return;
  if (state._isMaximized) {
    elements.maximizeBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="4 14 10 14 10 20"></polyline>
        <polyline points="20 10 14 10 14 4"></polyline>
        <line x1="10" y1="14" x2="3" y2="21"></line>
        <line x1="21" y1="3" x2="14" y2="10"></line>
      </svg>
    `;
    elements.maximizeBtn.title = "Restore";
  } else {
    elements.maximizeBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="15 3 21 3 21 9"></polyline>
        <polyline points="9 21 3 21 3 15"></polyline>
        <line x1="21" y1="3" x2="14" y2="10"></line>
        <line x1="3" y1="21" x2="10" y2="14"></line>
      </svg>
    `;
    elements.maximizeBtn.title = "Maximize";
  }
}

export function addSystemNotice(text: string) {
  const el = document.createElement('div');
  el.className = 'system-notice';
  const plain = text.replace(/\*\*(.+?)\*\*/g, '$1');
  el.innerHTML = '<span>' + plain.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</span>';
  elements.messagesContainer?.appendChild(el);
  scrollToBottom();
}



export function escapeHtml(str: string) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function renderAgentResponseIcon() {
  return `
    <div class="agent-response-icon" aria-hidden="true">
      ${INTERAONE_LOGO_SVG}
    </div>
  `;
}

function renderFileBubble(content: string, _bubbleType: string) {
  return escapeHtml(content);
}

export function addMessage(text: string, type: 'user' | 'agent', senderName: string, msgType: string = 'text') {
  if (!elements.messagesContainer) return;
  const messageDiv = document.createElement("div");
  messageDiv.className = `message ${type}`;
  if (msgType === 'file-uploading') messageDiv.classList.add('upload-placeholder');

  const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  let bodyHtml;
  if (msgType === 'file' || msgType === 'file-uploading' || msgType === 'image') {
    bodyHtml = renderFileBubble(text, type);
  } else if (type === 'agent') {
    bodyHtml = '<div class="md">' + parseMarkdown(text) + '</div><div class="message-time">' + time + '</div>';
  } else {
    bodyHtml = escapeHtml(text) + '<div class="message-time">' + time + '</div>';
  }

  messageDiv.innerHTML = (type === 'agent' ? renderAgentResponseIcon() : '') + '<div class="message-bubble">' + bodyHtml + '</div>';
  elements.messagesContainer.appendChild(messageDiv);
  scrollToBottom();
}

export function typeMessage(text: string) {
  removeTypingDots();
  if (!elements.messagesContainer) return;

  const messageDiv = document.createElement('div');
  messageDiv.className = 'message agent';
  const bubble = document.createElement('div');
  bubble.className = 'message-bubble';
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  bubble.innerHTML = '<div class="md">' + parseMarkdown(text) + '</div><div class="message-time">' + time + '</div>';
  messageDiv.innerHTML = renderAgentResponseIcon();
  messageDiv.appendChild(bubble);
  elements.messagesContainer.appendChild(messageDiv);
  scrollToBottom();
}

export function renderThoughtSteps(stepsEl: Element, steps: string[], thinkingIndex: number) {
  if (!stepsEl) return;

  const openIndexes = new Set(
    Array.from(stepsEl.querySelectorAll('.thought-step.completed.open')).map((el) =>
      Number(el.getAttribute('data-step-index'))
    )
  );

  if (!steps || steps.length === 0) {
    (stepsEl as HTMLElement).style.display = 'none';
    stepsEl.innerHTML = '';
    return;
  }

  (stepsEl as HTMLElement).style.display = 'flex';
  stepsEl.innerHTML = steps
    .map((step, idx) => {
      const isThinking = idx === thinkingIndex;
      if (isThinking) {
        return `
          <div class="thought-step thinking open" data-step-index="${idx}">
            <div class="thought-step-toggle interacting">
              <svg class="vx-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" stroke-opacity="0.25"/><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
              Thinking Process
            </div>
            <div class="thought-step-detail md">${parseMarkdown(step)}</div>
          </div>`;
      }

      return `
        <div class="thought-step completed" data-step-index="${idx}">
          <button type="button" class="thought-step-toggle" data-step-index="${idx}" aria-expanded="false" title="Show thought detail">
            <svg class="vx-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
            Thought Process
          </button>
          <div class="thought-step-detail md">${parseMarkdown(step)}</div>
        </div>`;
    })
    .join('');

  Array.from(stepsEl.querySelectorAll('.thought-step.completed')).forEach((el) => {
    const idx = Number(el.getAttribute('data-step-index'));
    const toggle = el.querySelector('.thought-step-toggle');
    if (!toggle) return;
    if (openIndexes.has(idx)) {
      el.classList.add('open');
      toggle.setAttribute('aria-expanded', 'true');
    }
  });
}

export function formatHistoryDateTime(value: string | number | Date | undefined): string {
  if (!value) return 'Unknown date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown date';
  return date.toLocaleString([], { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
