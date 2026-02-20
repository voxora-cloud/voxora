import { ContextResult } from "./types";
import { getEmbeddingProvider, vectorStore } from "../embeddings";
import config from "../config";

const DEFAULT_SYSTEM_PROMPT =
  process.env.AI_SYSTEM_PROMPT ||
  "You are a helpful customer support assistant. Be concise, friendly, and accurate.";

/**
 * Build the context object that is fed into the LLM.
 *
 * Stages:
 *  1. RAG — embed the user message, search Qdrant, inject matching chunks as context
 *  2. TODO: fetch recent conversation history from MongoDB
 *  3. TODO: MCP tool results injected here
 *  4. TODO: per-widget system prompt overrides from the Widget model
 */
export async function buildContext(
  conversationId: string,
  currentMessage: string,
  teamId?: string,
): Promise<ContextResult> {
  let systemPrompt = DEFAULT_SYSTEM_PROMPT;

  // ── RAG: search knowledge base for relevant chunks ───────────────────────────
  if (teamId) {
    try {
      const provider = getEmbeddingProvider();
      const queryVector = await provider.embed(currentMessage);
      const results = await vectorStore.search(queryVector, {
        teamId,
        topK: config.embeddings.ragTopK,
      });

      if (results.length > 0) {
        const knowledgeContext = results
          .map((r, i) => `[${i + 1}] ${r.payload.text}`)
          .join("\n\n");
        systemPrompt =
          `${DEFAULT_SYSTEM_PROMPT}\n\n` +
          `Use the following knowledge base excerpts to answer accurately:\n\n` +
          `${knowledgeContext}\n\n` +
          `If the answer is not in the excerpts, say so honestly.`;
      }
    } catch (err) {
      // RAG failure is non-fatal — fall back to base system prompt
      console.warn("[Context] RAG search failed, continuing without context:", err);
    }
  }

  // TODO: fetch history → await ConversationAPI.getMessages(conversationId, { limit: 10 })

  return {
    systemPrompt,
    messages: [
      {
        role: "user",
        content: currentMessage,
        timestamp: new Date(),
      },
    ],
  };
}
