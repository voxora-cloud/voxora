import mongoose from "mongoose";
import { ContextResult, ContextMessage } from "./types";
import { getEmbeddingProvider, vectorStore } from "../embeddings";
import { connectDB, MessageModel } from "../shared/db";
import config from "../config";

/** How many prior messages to include as conversation history */
const HISTORY_LIMIT = parseInt(process.env.CHAT_HISTORY_LIMIT || "10", 10);

/**
 * Build the base system prompt for the given company.
 * Supports markdown in responses and knows the company it represents.
 *
 * When `hasTeam` is true, the prompt includes escalation rules so the AI can
 * hand off complex or sensitive conversations to a human agent by outputting the
 * special sentinel:  [ESCALATE: <reason>]
 *
 * When `hasTeam` is false (no teams/agents configured), escalation is disabled —
 * the AI always handles the conversation itself.
 *
 * Resolution rules ([RESOLVE: <reason>]) are always included — the AI can close
 * the loop whether or not human agents are configured.
 */
function buildSystemPrompt(companyName?: string, hasTeam?: boolean): string {
  const company = companyName?.trim() || process.env.AI_COMPANY_NAME || "our company";

  const basePrompt =
    `You are a helpful, professional customer support assistant for **${company}**.

Your responsibilities:
- Answer customer questions accurately and concisely on behalf of **${company}**
- Be friendly, empathetic, and solution-focused
- If you don't know the answer, say so honestly
- Keep responses clear and well-structured

Formatting guidelines:
- Use **bold** to highlight key terms or important information
- Use bullet lists or numbered lists when presenting multiple steps or options
- Use inline \`code\` for technical values, commands, or IDs
- Keep paragraphs short — prefer 2–3 sentences max
- Never use raw HTML; use Markdown only`;

  // Resolution rules — always available (AI can close the loop in any mode)
  const resolutionRules = `

---

**Resolution rules:**

You MUST output ONLY the following sentinel — with no other text — when the issue is fully resolved:

  [RESOLVE: <brief reason>]

Trigger resolution when:
1. You have answered the user's question completely and they have confirmed it (e.g. "thanks", "that worked", "got it", "perfect")
2. The user explicitly says goodbye or that they are done (e.g. "bye", "that's all", "no more questions")
3. The conversation has naturally concluded with no outstanding issues

Examples of valid resolution outputs:
  [RESOLVE: user confirmed issue resolved]
  [RESOLVE: user said goodbye]
  [RESOLVE: question answered and user satisfied]

Do NOT include any other text when resolving. The sentinel must be the entire response.`;

  if (!hasTeam) {
    return basePrompt + resolutionRules;
  }

  // Escalation rules — only injected when human agents are available
  const escalationRules = `

---

**Escalation rules (human agents are available):**

You MUST output ONLY the following sentinel — with no other text — when any of these conditions apply:

  [ESCALATE: <brief reason>]

Trigger escalation when:
1. The user **explicitly requests a human agent** (e.g. "talk to a person", "speak to support", "connect me to an agent")
2. The question involves **sensitive topics**: billing disputes, refunds, account suspension, legal threats, privacy/data requests, or abuse
3. You **cannot confidently answer** after checking the knowledge base and are at risk of giving wrong information
4. The user shows **repeated frustration** (e.g. "you're useless", "I already told you", "this isn't helping") — especially after 2+ failed attempts
5. The conversation has had **many back-and-forth turns** (8+) without resolving the issue
6. The request requires **account-level access** or actions only a human can perform

Examples of valid escalation outputs:
  [ESCALATE: user requested human agent]
  [ESCALATE: billing dispute requires human review]
  [ESCALATE: unable to resolve with available knowledge]
  [ESCALATE: user frustration after multiple failed attempts]

Do NOT include any other text when escalating. The sentinel must be the entire response.`;

  return basePrompt + resolutionRules + escalationRules;
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
  organizationId: string,
  currentMessage: string,
  teamId?: string,
  companyName?: string,
  /** _id of the message just saved — excluded from history to avoid sending it twice */
  messageId?: string,
): Promise<ContextResult> {
  const hasTeam = !!teamId;
  let systemPrompt = buildSystemPrompt(companyName, hasTeam);

  console.log(`[Context] ──────────────────────────────────────────────────────`);
  console.log(`[Context] Building context for conversation: ${conversationId}`);
  console.log(`[Context] organizationId : ${organizationId}`);
  console.log(`[Context] teamId         : ${teamId && teamId.trim() !== "" ? teamId : "(OPTIONAL - not filtering by team)"}`);
  console.log(`[Context] companyName    : ${companyName || "(not set)"}`);
  console.log(`[Context] messageLength  : ${currentMessage.length} chars`);

  // ── 1. RAG: search knowledge base for relevant chunks ────────────────────────
  try {
    console.log(`[Context] Starting RAG search...`);
    const provider = getEmbeddingProvider();
    console.log(`[Context] Embedding provider: ${provider.constructor.name}, dimensions: ${provider.dimensions}`);
    
    const queryVector = await provider.embed(currentMessage);
    console.log(`[Context] Generated query vector (${queryVector.length}d)`);
    console.log(`[Context] Vector sample: [${queryVector.slice(0, 5).map(v => v.toFixed(4)).join(", ")}...]`);
    
    console.log(`[Context] Calling vectorStore.search with:`);
    console.log(`[Context]   - organizationId: ${organizationId}`);
    console.log(`[Context]   - topK: ${config.embeddings.ragTopK}`);
    
    const results = await vectorStore.search(queryVector, {
      organizationId,
      topK: config.embeddings.ragTopK,
    });

    console.log(`[Context] ✓ Search completed, received ${results.length} result(s)`);
    
    if (results.length > 0) {
      const knowledgeContext = results
        .map((r, i) => `[${i + 1}] ${r.payload.text}`)
        .join("\n\n");

      console.log(`[Context] ✅ RAG retrieved ${results.length} chunk(s) successfully`);
      console.log(`[Context] Query: "${currentMessage.slice(0, 100)}${currentMessage.length > 100 ? "..." : ""}"`);
      results.forEach((r, i) => {
        console.log(`[Context]   [${i + 1}] score=${r.score.toFixed(4)} orgId=${r.payload.organizationId} docId=${r.payload.documentId}`);
        console.log(`[Context]       text: ${String(r.payload.text).slice(0, 120).replace(/\n/g, " ")}…`);
      });

      systemPrompt =
        `${buildSystemPrompt(companyName, hasTeam)}\n\n` +
        `Use the following knowledge base excerpts to answer accurately:\n\n` +
        `${knowledgeContext}\n\n` +
        `If the answer is not in the excerpts, say so honestly.`;
      
      console.log(`[Context] ✓ System prompt enhanced with ${results.length} knowledge chunks`);
    } else {
      console.log(`[Context] ⚠️  RAG search returned 0 results`);
      console.log(`[Context]     Possible reasons:`);
      console.log(`[Context]     1. No documents ingested for organizationId: ${organizationId}`);
      console.log(`[Context]     2. Query doesn't semantically match indexed content`);
      console.log(`[Context]     3. Qdrant collection empty or not created yet`);
    }
  } catch (err: any) {
    console.error(`[Context] ❌ RAG search error:`);
    console.error(`[Context]    Error type: ${err?.constructor?.name || typeof err}`);
    console.error(`[Context]    Status: ${err?.status}`);
    console.error(`[Context]    Message: ${err?.message || String(err)}`);
    
    // Check if error is due to missing collection (404 on fresh deployment)
    if (err?.status === 404 && err?.data?.status?.error?.includes("doesn't exist")) {
      console.log(`[Context] ⚠️  Qdrant collection doesn't exist yet — creating with ${getEmbeddingProvider().dimensions}d vectors`);
      try {
        await vectorStore.ensureCollection(getEmbeddingProvider().dimensions);
        console.log(`[Context] ✓ Collection created successfully. RAG will work after documents are ingested.`);
      } catch (createErr) {
        console.error("[Context] ❌ Failed to create collection:", createErr);
      }
    } else {
      // RAG failure is non-fatal — fall back to base system prompt
      console.error("[Context] ⚠️  RAG search failed, continuing without context");
      if (err?.stack) {
        console.error(`[Context] Stack trace: ${err.stack}`);
      }
    }
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
    turnCount: allMessages.length,
    hasTeam,
  };
}
