import { parseMarkdown, extractThoughtSteps } from './utils/markdown';
import { state, PROTO_VERSION, DEFAULT_WIDGET_ICON_URL } from './config';

// Pre-query safe DOM elements (since Vite injects script type=module at end of body)
export const elements = {
  welcomeScreen: document.getElementById("welcomeScreen"),
  suggestionsContainer: document.getElementById("suggestions"),
  messagesContainer: document.getElementById("messagesContainer"),
  messageInput: document.getElementById("messageInput") as HTMLTextAreaElement,
  sendBtn: document.getElementById("sendBtn") as HTMLButtonElement,
  typingIndicator: document.getElementById("typingIndicator"),
  historyBtn: document.getElementById("historyBtn"),
  historyOverlay: document.getElementById("historyOverlay"),
  closeHistoryBtn: document.getElementById("closeHistoryBtn"),
  historyList: document.getElementById("historyList"),
  maximizeBtn: document.getElementById("vx-maximize"),
  minimizeBtn: document.getElementById("vx-minimize"),
  attachBtn: document.getElementById('attachBtn') as HTMLButtonElement,
  fileInput: document.getElementById('fileInput') as HTMLInputElement,
};

let _typingDotsEl: HTMLElement | null = null;

export function showTypingDots() {
  if (_typingDotsEl) return; 
  const wrapper = document.createElement('div');
  wrapper.className = 'message agent';
  wrapper.innerHTML = '<div class="message-bubble"><div class="typing-dots"><span></span><span></span><span></span></div></div>';
  _typingDotsEl = wrapper;
  elements.messagesContainer?.appendChild(wrapper);
  scrollToBottom();
}

export function removeTypingDots() {
  if (_typingDotsEl) {
    _typingDotsEl.remove();
    _typingDotsEl = null;
  }
}

export function showTyping() {
  if (elements.typingIndicator) elements.typingIndicator.style.display = "block";
  scrollToBottom();
}

export function hideTyping() {
  if (elements.typingIndicator) elements.typingIndicator.style.display = "none";
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

function getFileIcon(mimeType: string) {
  if (!mimeType) return '📄';
  if (mimeType.startsWith('image/')) return '🖼️';
  if (mimeType === 'application/pdf') return '📕';
  if (mimeType.includes('word')) return '📝';
  if (mimeType === 'text/plain') return '📃';
  return '📎';
}

function formatFileSize(bytes: number) {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export function escapeHtml(str: string) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderFileBubble(content: string, bubbleType: string) {
  try {
    const f = JSON.parse(content);
    const fileUrl = f.downloadUrl || (f.fileKey ? 'YOUR_API_BASE/api/v1/storage/file?key=' + encodeURIComponent(f.fileKey) : null);
    if (f.mimeType && f.mimeType.startsWith('image/') && fileUrl) {
      return '<img class="img-preview-msg" src="' + fileUrl + '" alt="' + escapeHtml(f.fileName || 'image') + '" onclick="window.open(this.src,\'_blank\')"><div class="message-time" style="margin-top:4px">' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + '</div>';
    }
    const link = fileUrl ? '<a class="file-bubble" href="' + fileUrl + '" target="_blank" rel="noopener">' : '<div class="file-bubble">';
    const linkClose = fileUrl ? '</a>' : '</div>';
    return link +
      '<div class="file-bubble-icon">' + getFileIcon(f.mimeType) + '</div>' +
      '<div class="file-bubble-info">' +
      '<span class="file-bubble-name">' + escapeHtml(f.fileName || 'File') + '</span>' +
      '<span class="file-bubble-meta">' + (fileUrl ? 'Download · ' : 'Uploading… · ') + formatFileSize(f.fileSize) + '</span>' +
      '</div>' + linkClose +
      '<div class="message-time" style="margin-top:6px">' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + '</div>';
  } catch (e) {
    return escapeHtml(content);
  }
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

  messageDiv.innerHTML = '<div class="message-bubble">' + bodyHtml + '</div>';
  elements.messagesContainer.appendChild(messageDiv);
  scrollToBottom();

  if (type === "agent" && window.parent) {
    state.unreadCount++;
    window.parent.postMessage({ type: 'UNREAD_COUNT', version: PROTO_VERSION, payload: { count: state.unreadCount } }, state.parentOrigin || '*');
  }
}

export function typeMessage(text: string) {
  removeTypingDots();
  if (!elements.messagesContainer) return;

  const messageDiv = document.createElement('div');
  messageDiv.className = 'message agent';
  const bubble = document.createElement('div');
  bubble.className = 'message-bubble';
  messageDiv.appendChild(bubble);
  elements.messagesContainer.appendChild(messageDiv);
  scrollToBottom();

  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const words = text.split(' ');
  let wordIndex = 0;
  let accumulated = '';
  let contentEl: HTMLDivElement | null = null;

  function typeNextWord() {
    if (wordIndex === 0) {
      contentEl = document.createElement('div');
      contentEl.className = 'md typing-cursor';
      bubble.innerHTML = '';
      bubble.appendChild(contentEl);
      const timePlaceholder = document.createElement('div');
      timePlaceholder.className = 'message-time';
      timePlaceholder.style.visibility = 'hidden';
      timePlaceholder.textContent = time;
      bubble.appendChild(timePlaceholder);
    }

    if (wordIndex < words.length && contentEl) {
      accumulated += (wordIndex === 0 ? '' : ' ') + words[wordIndex];
      contentEl.textContent = accumulated;
      wordIndex++;
      scrollToBottom();
      setTimeout(typeNextWord, 28);
    } else if (contentEl) {
      contentEl.classList.remove('typing-cursor');
      contentEl.innerHTML = parseMarkdown(text);
      const timeEl = bubble.querySelector('.message-time') as HTMLDivElement;
      if (timeEl) { timeEl.style.visibility = ''; timeEl.textContent = time; }
      scrollToBottom();
      if (window.parent) {
        state.unreadCount++;
        window.parent.postMessage({ type: 'UNREAD_COUNT', version: PROTO_VERSION, payload: { count: state.unreadCount } }, state.parentOrigin || '*');
      }
    }
  }
  typeNextWord();
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
