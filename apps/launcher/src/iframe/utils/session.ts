// Session store helpers (localStorage)
function getOriginScope(origin?: string | null) {
  if (!origin) return '';
  try {
    let hostname = new URL(origin).hostname.toLowerCase();
    if (hostname.startsWith('www.')) hostname = hostname.slice(4);
    return hostname;
  } catch {
    return origin.trim().toLowerCase();
  }
}

export function getSessionKey(pubKey: string, origin?: string | null) {
  const scope = getOriginScope(origin);
  return 'InteraOne_sess_' + pubKey + (scope ? '_' + encodeURIComponent(scope) : '');
}

export function loadStoredSession(pubKey: string, origin?: string | null) {
  try {
    const raw = localStorage.getItem(getSessionKey(pubKey, origin));
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

export function persistSession(pubKey: string, token: string, expiresAt: number, sessionId: string, origin?: string | null) {
  try {
    const data = JSON.stringify({ token, expiresAt, sessionId });
    localStorage.setItem(getSessionKey(pubKey, origin), data);
  } catch {
    // Silently ignore
  }
}

export function clearStoredSession(pubKey: string, origin?: string | null) {
  try {
    localStorage.removeItem(getSessionKey(pubKey, origin));
  } catch {
    // Silently ignore storage access failures in sandboxed/private contexts.
  }
}
