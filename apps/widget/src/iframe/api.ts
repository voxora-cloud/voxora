import { state, API_BASE_URL } from './config';
import { loadStoredSession, persistSession, clearStoredSession, getSessionKey } from './utils/session';
import { elements, addMessage, removeTypingDots } from './ui';

export async function makeAuthenticatedRequest(url: string, options: any = {}) {
  const defaultHeaders: any = {
    'Content-Type': 'application/json',
  };

  if (state.widgetToken) {
    defaultHeaders.Authorization = `Bearer ${state.widgetToken}`;
  }

  const mergedOptions = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers
    }
  };

  try {
    const response = await fetch(url, mergedOptions);
    if (response.status === 401 && state.widgetToken) {
      console.log('Widget token expired or invalid');
    }
    return response;
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}

export async function bootstrapSession(initPayload: any, onReady: (token: string, sessionId: string) => void) {
  const { publicKey, apiUrl, visitorId, identity } = initPayload;

  const stored = loadStoredSession(publicKey);
  if (stored) {
    console.log('[VoxoraWidget] Resuming session from iframe localStorage');
    state.currentSessionId = stored.sessionId;
    onReady(stored.token, stored.sessionId);
    return;
  }

  let preservedSessionId = null;
  try {
    const raw = localStorage.getItem(getSessionKey(publicKey));
    if (raw) {
      const old = JSON.parse(raw);
      if (old?.sessionId) preservedSessionId = old.sessionId;
    }
  } catch {}

  console.log('[VoxoraWidget] Bootstrapping new session...');
  try {
    const body: any = {
      voxoraPublicKey: publicKey,
      origin: initPayload.pageUrl ? new URL(initPayload.pageUrl).origin : undefined,
    };
    if (identity && identity.userId) {
      body.userId = identity.userId;
      body.userEmail = identity.email;
      body.userName = identity.name;
    }

    const abortCtrl = new AbortController();
    const fetchTimeout = setTimeout(() => abortCtrl.abort(), 10_000);
    let res;
    try {
      res = await fetch(`${apiUrl}/api/v1/widget/auth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        credentials: 'omit',
        signal: abortCtrl.signal,
      });
    } finally {
      clearTimeout(fetchTimeout);
    }

    if (!res.ok) throw new Error(`Auth failed: ${res.status}`);
    const data = await res.json();
    if (!data.success || !data.data?.token) throw new Error('Invalid auth response');

    const token = data.data.token;
    const expiresAt = data.data.expiresAt || (Date.now() + 60 * 60 * 1000);
    const sessionId = data.data.sessionId || (visitorId && visitorId.length > 4 ? visitorId : null) || preservedSessionId || ('sess_' + Date.now());

    persistSession(publicKey, token, expiresAt, sessionId, visitorId);
    state.currentSessionId = sessionId;
    onReady(token, sessionId);
  } catch (err) {
    console.error('[VoxoraWidget] Session bootstrap failed:', err);
    clearStoredSession(publicKey);
    if (elements.messageInput && elements.sendBtn) {
      elements.messageInput.disabled = false;
      elements.messageInput.placeholder = 'Connection failed — try refreshing';
      elements.sendBtn.disabled = true;
    }
  }
}

export async function fetchMessagesFromBackend(conversationId: string) {
  if (!state.widgetToken || !state.currentSessionId) return [];
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/widget/conversations/${conversationId}/messages?sessionId=${encodeURIComponent(state.currentSessionId)}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${state.widgetToken}`
        }
      }
    );
    if (!response.ok) return [];
    const data = await response.json();
    return data.data?.messages || [];
  } catch (error) {
    console.error('Error fetching messages from backend:', error);
    return [];
  }
}

export async function uploadAndSendFile(file: File) {
  if (!state.widgetToken) return;
  if (!state.chatId) {
    alert('Please send your first message to start the conversation, then attach files.');
    return;
  }
  const MAX = 10 * 1024 * 1024;
  if (file.size > MAX) { alert('File too large (max 10 MB)'); return; }

  const meta = { fileName: file.name, fileSize: file.size, mimeType: file.type, fileKey: null };
  addMessage(JSON.stringify(meta), 'user', state.userName || 'You', 'file-uploading');

  function removeLastPlaceholder() {
    if (!elements.messagesContainer) return;
    const ph = elements.messagesContainer.querySelectorAll('.upload-placeholder');
    if (ph.length) ph[ph.length - 1].remove();
  }

  try {
    const urlResp = await makeAuthenticatedRequest(
      API_BASE_URL + '/api/v1/widget/upload-url',
      { method: 'POST', body: JSON.stringify({ fileName: file.name, mimeType: file.type }) }
    );
    if (!urlResp.ok) throw new Error('Upload URL failed');
    const { data } = await urlResp.json();

    const putResp = await fetch(data.uploadUrl, {
      method: 'PUT',
      body: file,
      headers: { 'Content-Type': file.type },
    });
    if (!putResp.ok) throw new Error('Storage upload failed');

    removeLastPlaceholder();
    const fileContent = JSON.stringify({
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      fileKey: data.fileKey,
      downloadUrl: data.downloadUrl || null,
    });
    addMessage(fileContent, 'user', state.userName || 'You', 'file');

    if (state.socket) {
      state.socket.emit('send_message', {
        conversationId: state.chatId,
        content: fileContent,
        type: file.type.startsWith('image/') ? 'image' : 'file',
        metadata: { source: 'widget' },
      });
    }
  } catch (err: any) {
    console.error('[VoxoraWidget] File upload failed:', err);
    removeLastPlaceholder();
    alert('File upload failed: ' + (err.message || 'Unknown error'));
  }
}
