/**
 * Visitor Management (Loader-side)
 *
 * PURPOSE
 * -------
 * This module runs on the CUSTOMER'S domain inside the loader script.
 * It is the ONLY place that reads/writes to customer-domain localStorage.
 *
 * The iframe (on the InteraOne domain) NEVER reads customer localStorage.
 * Instead, the loader passes the visitor ID to the iframe
 * exclusively via the INIT_WIDGET postMessage.
 *
 * WHY THIS MATTERS
 * ----------------
 * iframes are cross-origin relative to the customer's page, so they can't
 * read the parent page's localStorage anyway (security policy enforces this).
 * Trying to do so throws a DOMException. This architecture makes the
 * isolation explicit and intentional, not accidental.
 *
 * VISITOR ID
 * ----------
 * A stable anonymous identifier that persists across sessions on the same
 * customer domain. Lives in customer localStorage under 'InteraOne_visitor_id'.
 * Similar to how Segment generates an anonymous ID.
 */

const VISITOR_ID_KEY = 'InteraOne_visitor_id';

// ─── Visitor ID ───────────────────────────────────────────────────────────────

/**
 * Get the existing visitor ID or generate and persist a new one.
 *
 * Falls back to an ephemeral (not persisted) ID if localStorage is blocked
 * (e.g. private browsing with strict settings, or 3rd-party cookie restrictions).
 * In that case the visitor will get a new ID each page load — acceptable degraded
 * behaviour, identical to how analytics tools handle this case.
 */
export function getOrCreateVisitorId(): string {
  try {
    const existing = localStorage.getItem(VISITOR_ID_KEY);
    if (existing && /^v_[0-9a-f]{32}$/.test(existing)) return existing;

    const id = generateId('v_');
    localStorage.setItem(VISITOR_ID_KEY, id);
    return id;
  } catch {
    // localStorage blocked — return ephemeral ID, don't persist
    return generateId('v_');
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateId(prefix: string): string {
  // Prefer crypto.randomUUID (available in all modern browsers)
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return prefix + crypto.randomUUID().replace(/-/g, '');
  }
  // Fallback: PRNG-based 128-bit hex string
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return prefix + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}
