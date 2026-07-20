import { state, API_BASE_URL } from './config';
import { loadStoredSession, persistSession, clearStoredSession, getSessionKey } from './utils/session';
import { elements } from './ui';

export async function makeAuthenticatedRequest(url: string, options: any = {}) {
  const defaultHeaders: any = {
    'Content-Type': 'application/json',
  };

  if (state.widgetToken) {
    defaultHeaders.Authorization = `Bearer ${state.widgetToken}`;
    if (state.parentOrigin) {
      defaultHeaders['X-InteraOne-Origin'] = state.parentOrigin;
    }
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
  const { publicKey, apiUrl, identity } = initPayload;
  const pageOrigin = initPayload.pageUrl ? new URL(initPayload.pageUrl).origin : state.parentOrigin;

  const stored = loadStoredSession(publicKey, pageOrigin);
  if (stored) {
    console.log('[InteraOneWidget] Resuming session from iframe localStorage');
    state.currentSessionId = stored.sessionId;
    onReady(stored.token, stored.sessionId);
    return;
  }

  let preservedSessionId = null;
  try {
    const raw = localStorage.getItem(getSessionKey(publicKey, pageOrigin));
    if (raw) {
      const old = JSON.parse(raw);
      if (old?.sessionId) preservedSessionId = old.sessionId;
    }
  } catch {
    // Ignore malformed legacy session data and continue with a fresh token.
  }

  console.log('[InteraOneWidget] Bootstrapping new session...');
  try {
    const body: any = {
      InteraOnePublicKey: publicKey,
      origin: pageOrigin || undefined,
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
    const sessionId = data.data.sessionId || preservedSessionId || ('sess_' + Date.now());

    persistSession(publicKey, token, expiresAt, sessionId, pageOrigin);
    state.currentSessionId = sessionId;
    onReady(token, sessionId);
  } catch (err) {
    console.error('[InteraOneWidget] Session bootstrap failed:', err);
    clearStoredSession(publicKey, pageOrigin);
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
    const response = await makeAuthenticatedRequest(
      `${API_BASE_URL}/api/v1/widget/conversations/${conversationId}/messages?sessionId=${encodeURIComponent(state.currentSessionId)}`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
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
