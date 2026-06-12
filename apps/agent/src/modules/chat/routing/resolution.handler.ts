import type { ResolutionRoute } from "./routing.types";

const RESOLVE_RE = /\[RESOLVE:\s*(.+?)\]/i;

function stripSentinel(text: string, re: RegExp): string {
  return text.replace(re, "").replace(/\n{3,}/g, "\n\n").trim();
}

export function detectResolution(response: string): ResolutionRoute | null {
  const match = response.match(RESOLVE_RE);
  if (!match) return null;
  return {
    type: "resolution",
    reason: match[1].trim(),
    cleanText: stripSentinel(response, RESOLVE_RE),
  };
}
