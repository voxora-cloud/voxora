import { Chunk } from "../ingestion.types";

const DEFAULT_CHUNK_SIZE = 1000;    
const DEFAULT_OVERLAP    = 200;     








export function chunkText(
  text: string,
  chunkSize = DEFAULT_CHUNK_SIZE,
  overlap = DEFAULT_OVERLAP,
): Chunk[] {
  
  const cleaned = text.replace(/\n{3,}/g, "\n\n").trim();
  if (!cleaned) return [];

  const chunks: Chunk[] = [];
  let startPos = 0;
  let index = 0;

  while (startPos < cleaned.length) {
    let endPos = Math.min(startPos + chunkSize, cleaned.length);

    
    if (endPos < cleaned.length) {
      const breakAt = findBreakPoint(cleaned, endPos, Math.max(startPos, endPos - 200));
      if (breakAt !== -1) endPos = breakAt;
    }

    const chunkText = cleaned.slice(startPos, endPos).trim();
    if (chunkText.length > 0) {
      chunks.push({ text: chunkText, index, startPos, endPos });
      index++;
    }

    
    if (endPos >= cleaned.length) break;

    
    const nextStart = endPos - overlap;
    
    startPos = nextStart > startPos ? nextStart : startPos + 1;
  }

  return chunks;
}

 
function findBreakPoint(text: string, from: number, limit: number): number {
  for (let i = from; i >= limit; i--) {
    if (text[i] === "\n" && text[i - 1] === "\n") return i;
    if (text[i] === " " && text[i - 1] === ".") return i + 1;
    if (text[i] === "\n" && text[i - 1] === ".") return i + 1;
  }
  return -1;
}
