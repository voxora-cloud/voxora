import { Chunk } from "./types";

const DEFAULT_CHUNK_SIZE = 1000;    // characters per chunk
const DEFAULT_OVERLAP    = 200;     // overlap between consecutive chunks

/**
 * Split a long text into overlapping chunks for embedding.
 *
 * Strategy: slide a fixed-size window over the text, honouring sentence
 * boundaries where possible (split at ". " or "\n" near the boundary to
 * avoid cutting mid-sentence).
 */
export function chunkText(
  text: string,
  chunkSize = DEFAULT_CHUNK_SIZE,
  overlap = DEFAULT_OVERLAP,
): Chunk[] {
  // Normalise whitespace — collapse runs of blank lines
  const cleaned = text.replace(/\n{3,}/g, "\n\n").trim();
  if (!cleaned) return [];

  const chunks: Chunk[] = [];
  let startPos = 0;
  let index = 0;

  while (startPos < cleaned.length) {
    let endPos = Math.min(startPos + chunkSize, cleaned.length);

    // Try to break at a sentence / paragraph boundary near the end
    if (endPos < cleaned.length) {
      const breakAt = findBreakPoint(cleaned, endPos, Math.max(startPos, endPos - 200));
      if (breakAt !== -1) endPos = breakAt;
    }

    const chunkText = cleaned.slice(startPos, endPos).trim();
    if (chunkText.length > 0) {
      chunks.push({ text: chunkText, index, startPos, endPos });
      index++;
    }

    // We consumed to the end of the text — stop
    if (endPos >= cleaned.length) break;

    // Advance start, keeping overlap
    const nextStart = endPos - overlap;
    // Guard: if we didn't advance at all (pathological overlap >= chunkSize), force +1
    startPos = nextStart > startPos ? nextStart : startPos + 1;
  }

  return chunks;
}

/** Scan backwards from `from` to `limit` looking for ". ", ".\n", or "\n\n" */
function findBreakPoint(text: string, from: number, limit: number): number {
  for (let i = from; i >= limit; i--) {
    if (text[i] === "\n" && text[i - 1] === "\n") return i;
    if (text[i] === " " && text[i - 1] === ".") return i + 1;
    if (text[i] === "\n" && text[i - 1] === ".") return i + 1;
  }
  return -1;
}
