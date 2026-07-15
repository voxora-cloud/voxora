/**
 * Lightweight timer helpers used across all pipeline and worker files.
 *
 * Pattern used everywhere:
 *   const { cid, t } = makeTimer(conversationId);
 *   console.time(t("total"));
 *   console.timeEnd(t("total"));
 */

/**
 * Create a short, unique suffix from an ID so that concurrent job timers
 * in the same process don't collide with each other.
 *
 * @param id - Any unique identifier (e.g. conversationId, documentId)
 * @param suffixLength - Number of trailing characters to use (default 8)
 */
export function makeTimer(id: string, suffixLength = 8) {
  const cid = id.slice(-suffixLength);
  const t = (label: string) => `[${cid}] ${label}`;
  return { cid, t };
}
