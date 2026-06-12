import type { EscalationRoute } from "./routing.types";

const ESCALATE_RE = /\[ESCALATE:\s*(.+?)\]/i;

function stripSentinel(text: string, re: RegExp): string {
  return text.replace(re, "").replace(/\n{3,}/g, "\n\n").trim();
}

export function detectEscalation(response: string): EscalationRoute | null {
  const match = response.match(ESCALATE_RE);
  if (!match) return null;
  return {
    type: "escalation",
    reason: match[1].trim(),
    cleanText: stripSentinel(response, ESCALATE_RE),
  };
}
