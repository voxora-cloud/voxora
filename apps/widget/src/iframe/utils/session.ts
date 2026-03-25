// Cookie helpers for sessionId (works in sandboxed iframes)
export function setCookie(name: string, value: string, days: number) {
  const expires = new Date();
  expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
}

export function getCookie(name: string) {
  const nameEQ = name + "=";
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
}

export function getOrCreateSessionId() {
  try {
    let sessionId = getCookie('voxora_session_id');
    if (sessionId) return sessionId;

    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setCookie('voxora_session_id', sessionId, 365);
    return sessionId;
  } catch (error) {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export function getSessionKey(pubKey: string) {
  return 'voxora_sess_' + pubKey;
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
  try { localStorage.removeItem(getSessionKey(pubKey)); } catch {}
}
