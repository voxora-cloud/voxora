import { ContextResult, ContextMessage } from "./types";
import { getEmbeddingProvider, vectorStore } from "../embeddings";
import { connectDB, MessageModel } from "../ingestion/db";
import config from "../config";

const DEFAULT_SYSTEM_PROMPT =
  process.env.AI_SYSTEM_PROMPT ||
  "You are a helpful customer support assistant the end user can talking with you from different sources (widget,call,custom sdk). Be concise, friendly, and accurate.";

/** How many prior messages to include as conversation history */
const HISTORY_LIMIT = parseInt(process.env.CHAT_HISTORY_LIMIT || "10", 10);

/**
 * Build the context object that is fed into the LLM.
 *
 * Stages:
 *  1. RAG   — embed the user message, search Qdrant, inject relevant chunks
 *  2. History — fetch the last N messages from MongoDB for multi-turn context
 *  3. Assemble system prompt + history + current message
 */
export async function buildContext(
  conversationId: string,
  currentMessage: string,
  teamId?: string,
): Promise<ContextResult> {
  let systemPrompt = DEFAULT_SYSTEM_PROMPT;

  // ── 1. RAG: search knowledge base for relevant chunks ────────────────────────
  try {
    const provider = getEmbeddingProvider();
    const queryVector = await provider.embed(currentMessage);
    const results = await vectorStore.search(queryVector, {
      topK: config.embeddings.ragTopK,
    });

    if (results.length > 0) {
      const knowledgeContext = results
        .map((r, i) => `[${i + 1}] ${r.payload.text}`)
        .join("\n\n");

      console.log(`[Context] RAG retrieved ${results.length} chunk(s) for query: "${currentMessage}"`);
      results.forEach((r, i) => {
        console.log(`  [${i + 1}] score=${r.score.toFixed(4)} docId=${r.payload.documentId} | ${String(r.payload.text).slice(0, 120).replace(/\n/g, " ")}…`);
      });

      systemPrompt =
        `${DEFAULT_SYSTEM_PROMPT}\n\n` +
        `Use the following knowledge base excerpts to answer accurately:\n\n` +
        `${knowledgeContext}\n\n` +
        `If the answer is not in the excerpts, say so honestly.`;
    } else {
      console.log(`[Context] RAG: no matching chunks found`);
    }
  } catch (err) {
    // RAG failure is non-fatal — fall back to base system prompt
    console.warn("[Context] RAG search failed, continuing without context:", err);
  }

  // ── 2. Conversation history from MongoDB ─────────────────────────────────────
  const history: ContextMessage[] = [];
  try {
    await connectDB();

    // Fetch the N most recent messages (newest first), then reverse for chronological order
    const rawMessages = await (MessageModel as any)
      .find({ conversationId })
      .sort({ createdAt: -1 })
      .limit(HISTORY_LIMIT)
      .lean();

    const chronological = (rawMessages as any[]).reverse();

    for (const m of chronological) {
      // Determine role: ai-bot and metadata.source==="ai" are assistant turns
      const isAssistant =
        m.senderId === "ai-bot" || m.metadata?.source === "ai";
      history.push({
        role: isAssistant ? "assistant" : "user",
        content: m.content as string,
        timestamp: m.createdAt as Date,
      });
    }
  } catch (err) {
    // Non-fatal — proceed without history if DB is unavailable
    console.warn("[Context] Failed to fetch conversation history:", err);
  }

  // ── 3. Assemble: history + current user message ───────────────────────────────
  return {
    systemPrompt,
    messages: [
      ...history,
      { role: "user", content: currentMessage, timestamp: new Date() },
    ],
  };
}
