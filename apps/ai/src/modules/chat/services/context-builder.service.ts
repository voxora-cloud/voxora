import mongoose from "mongoose";
import { ContextResult, ContextMessage } from "../chat.types";
import { vectorStore } from "../../../infrastructure/vector";
import { connectDB, MessageModel } from "../../../shared/db/db";
import config from "../../../config";
import { getEmbeddingProvider } from "../../../infrastructure/providers/embedding";

/** How many prior messages to include as conversation history */
const HISTORY_LIMIT = parseInt(process.env.CHAT_HISTORY_LIMIT || "10", 10);

interface CollectUserInfo {
  name?: boolean;
  email?: boolean;
  phone?: boolean;
}

interface BuildSystemPromptOptions {
  companyName?: string;
  /** True when a human team exists for this org */
  hasTeam: boolean;
  /** Whether the widget config allows AI to escalate to a human */
  fallbackToAgent: boolean;
  /** Which visitor info fields the AI should collect during conversation */
  collectUserInfo?: CollectUserInfo;
}

/**
 * Build the base system prompt for the given company.
 *
 * Behaviour driven by widget config:
 *  - `fallbackToAgent === false`  → escalation rules are NEVER injected even
 *    when `hasTeam` is true; AI always resolves on its own.
 *  - `collectUserInfo.*`          → a user-info-collection section is injected
 *    instructing the AI to naturally ask for the enabled fields.
 *  - Resolution rules are always present — the AI can always close the loop.
 */
function buildSystemPrompt(opts: BuildSystemPromptOptions): string {
  const { companyName, hasTeam, fallbackToAgent, collectUserInfo } = opts;
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
- Never use raw HTML; use Markdown only

Tool usage:
- You MUST always call the "rewrite_and_think" tool before giving your final answer, to plan your approach.`;

  // ── User info collection rules ──────────────────────────────────────────────
  const wantsName  = collectUserInfo?.name  === true;
  const wantsEmail = collectUserInfo?.email === true;
  const wantsPhone = collectUserInfo?.phone === true;
  const wantsAny   = wantsName || wantsEmail || wantsPhone;

  let userInfoSection = "";
  if (wantsAny) {
    const fields: string[] = [];
    if (wantsName)  fields.push("their **name**");
    if (wantsEmail) fields.push("their **email address** (for follow-up)");
    if (wantsPhone) fields.push("their **phone number** (optional, for callback support)");

    const fieldList = fields.join(", ");

    userInfoSection = `

---

**Visitor information collection:**

Early in the conversation — ideally within the first 1–2 exchanges — naturally ask the visitor for ${fieldList}.
- Do this conversationally, not like a form. For example: "Before we dive in, could I get your name?" or "Happy to help! May I have your email so we can follow up if needed?"
- Once the visitor provides the information, acknowledge it warmly and move on.
- Immediately call the tool \`update_contact_profile\` with any provided fields (name/email/phone) so the profile is saved.
- If the visitor declines or skips, respect that and continue helping them without pressing further.
- Do NOT repeat the request if they've already provided it or declined.`;
  }

  // ── Resolution rules — always present ──────────────────────────────────────
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

  // ── Escalation rules — only when BOTH hasTeam AND fallbackToAgent are true ──
  const canEscalate = hasTeam && fallbackToAgent;

  if (!canEscalate) {
    // No escalation available — either no team or admin disabled fallback.
    // Tell the AI explicitly so it doesn't promise something it can't do.
    const noEscalateNote = !fallbackToAgent
      ? `

---

**Important:** Human agent escalation is disabled for this widget. You MUST handle all requests yourself.
Do NOT offer to connect the user to a human. Do NOT output any [ESCALATE] sentinel.`
      : ""; // hasTeam is false — original behavior, just no escalation block

    return basePrompt + userInfoSection + resolutionRules + noEscalateNote;
  }

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

  return basePrompt + userInfoSection + resolutionRules + escalationRules;
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
  companyName?: string,
  /** _id of the message just saved — excluded from history to avoid sending it twice */
  messageId?: string,
  teamId?: string,
  fallbackToAgent?: boolean,
  collectUserInfo?: CollectUserInfo,
): Promise<ContextResult> {
  const hasTeam = !!teamId;
  const canFallback = fallbackToAgent !== false; // default true when not explicitly set

  let systemPrompt = buildSystemPrompt({
    companyName,
    hasTeam,
    fallbackToAgent: canFallback,
    collectUserInfo,
  });

  console.log(`[Context] ──────────────────────────────────────────────────────`);
  console.log(`[Context] Building context for conversation: ${conversationId}`);
  console.log(`[Context] organizationId : ${organizationId}`);
  console.log(`[Context] teamId         : ${teamId && teamId.trim() !== "" ? teamId : "(OPTIONAL - not filtering by team)"}`);
  console.log(`[Context] companyName    : ${companyName || "(not set)"}`);
  console.log(`[Context] fallbackToAgent: ${canFallback}`);
  console.log(`[Context] collectUserInfo: ${JSON.stringify(collectUserInfo ?? {})}`);
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
        `${buildSystemPrompt({ companyName, hasTeam, fallbackToAgent: canFallback, collectUserInfo })}\n\n` +
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
    const convOid = new mongoose.Types.ObjectId(conversationId);

    const excludeFilter = messageId
      ? { _id: { $ne: new mongoose.Types.ObjectId(messageId) } }
      : {};

    const rawMessages = await (MessageModel as any)
      .find({ conversationId: convOid, ...excludeFilter })
      .sort({ createdAt: -1 })
      .limit(HISTORY_LIMIT)
      .lean();

    console.log(`[History] DB returned ${rawMessages.length} message(s) for conversation ${conversationId}`);

    const chronological = (rawMessages as any[]).reverse();

    for (const m of chronological) {
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
