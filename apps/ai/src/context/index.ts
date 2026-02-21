import mongoose from "mongoose";
import { ContextResult, ContextMessage } from "./types";
import { getEmbeddingProvider, vectorStore } from "../embeddings";
import { connectDB, MessageModel } from "../ingestion/db";
import config from "../config";

/** How many prior messages to include as conversation history */
const HISTORY_LIMIT = parseInt(process.env.CHAT_HISTORY_LIMIT || "10", 10);

/**
 * Build the base system prompt for the given company.
 * Supports markdown in responses and knows the company it represents.
 */
function buildSystemPrompt(companyName?: string): string {
  const company = companyName?.trim() || process.env.AI_COMPANY_NAME || "our company";
  return (
    process.env.AI_SYSTEM_PROMPT ||
`You are a helpful, professional customer support assistant for **${company}**.

Your responsibilities:
- Answer customer questions accurately and concisely on behalf of **${company}**
- Be friendly, empathetic, and solution-focused
- If you don't know the answer, say so honestly and offer to escalate
- Keep responses clear and well-structured

Formatting guidelines:
- Use **bold** to highlight key terms or important information
- Use bullet lists or numbered lists when presenting multiple steps or options
- Use inline \`code\` for technical values, commands, or IDs
- Keep paragraphs short — prefer 2–3 sentences max
- Never use raw HTML; use Markdown only`
  );
}

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
  companyName?: string,
  /** _id of the message just saved — excluded from history to avoid sending it twice */
  messageId?: string,
): Promise<ContextResult> {
  let systemPrompt = buildSystemPrompt(companyName);

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
        `${buildSystemPrompt(companyName)}\n\n` +
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

    console.log(`[History] conversationId raw  : ${conversationId}`);
    console.log(`[History] messageId (exclude) : ${messageId ?? "none"}`);
    console.log(`[History] HISTORY_LIMIT       : ${HISTORY_LIMIT}`);

    // Bug fix: conversationId is stored as ObjectId in MongoDB.
    // The MessageModel uses strict:false — no type coercion — so a plain string
    // query never matches ObjectId-stored fields. Cast explicitly.
    const convOid = new mongoose.Types.ObjectId(conversationId);

    // Exclude the message that was just saved (it was persisted before the job
    // was queued, so without this exclusion it would arrive both as history AND
    // as currentMessage — confusing the LLM).
    const excludeFilter = messageId
      ? { _id: { $ne: new mongoose.Types.ObjectId(messageId) } }
      : {};

    // Fetch the N most recent messages (newest first), then reverse for chronological order
    const rawMessages = await (MessageModel as any)
      .find({ conversationId: convOid, ...excludeFilter })
      .sort({ createdAt: -1 })
      .limit(HISTORY_LIMIT)
      .lean();

    console.log(`[History] DB returned ${rawMessages.length} message(s) for conversation ${conversationId}`);

    const chronological = (rawMessages as any[]).reverse();

    for (const m of chronological) {
      // Determine role: ai-bot and metadata.source==="ai" are assistant turns
      const isAssistant =
        m.senderId === "ai-bot" || m.metadata?.source === "ai";
      const role = isAssistant ? "assistant" : "user";
      history.push({
        role,
        content: m.content as string,
        timestamp: m.createdAt as Date,
      });
      console.log(`  [History] ${role.padEnd(9)} | senderId=${String(m.senderId).slice(0, 16).padEnd(16)} | ${String(m.content).slice(0, 80).replace(/\n/g, " ")}`);
    }
  } catch (err) {
    // Non-fatal — proceed without history if DB is unavailable
    console.warn("[Context] Failed to fetch conversation history:", err);
  }

  // ── 3. Assemble: history + current user message ───────────────────────────────
  const allMessages: ContextMessage[] = [
    ...history,
    { role: "user", content: currentMessage, timestamp: new Date() },
  ];

  console.log(`[History] Thread sent to LLM: ${allMessages.length} turn(s)`);
  allMessages.forEach((m, i) =>
    console.log(`  [LLM turn ${i + 1}] ${m.role.padEnd(9)} | ${m.content.slice(0, 100).replace(/\n/g, " ")}`),
  );

  return {
    systemPrompt,
    messages: allMessages,
  };
}
