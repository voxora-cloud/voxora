// Session store helpers (localStorage)
export function getSessionKey(pubKey: string) {
  return 'InteraOne_sess_' + pubKey;
}

export function loadStoredSession(pubKey: string) {
  try {
    const raw = localStorage.getItem(getSessionKey(pubKey));
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (s && s.token && s.expiresAt && Date.now() < s.expiresAt - 30_000) {
      return s;
    }
    return null;
  } catch {
    return null;
  }
}

export function persistSession(pubKey: string, token: string, expiresAt: number, sessionId: string, visitorId: string) {
  try {
    const data = JSON.stringify({ token, expiresAt, sessionId, visitorId });
    localStorage.setItem(getSessionKey(pubKey), data);
  } catch {
    // Silently ignore
  }
}

export function clearStoredSession(pubKey: string) {
  try {
    localStorage.removeItem(getSessionKey(pubKey));
  } catch {
    // Silently ignore storage access failures in sandboxed/private contexts.
  }
}
