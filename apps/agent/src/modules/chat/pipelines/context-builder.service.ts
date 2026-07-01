import { ContextResult, ContextMessage, CollectUserInfo, KnownVisitorDetails } from "../chat.types";
import { internalApi } from "../../../infrastructure/api/internal.client";
import { cacheRedis } from "../../../infrastructure/cache/redis.client";
import { buildSystemPrompt } from "./system-prompt.builder";


const HISTORY_LIMIT = parseInt(process.env.CHAT_HISTORY_LIMIT || "10", 10);
const MEMORY_CACHE_TTL_SECONDS = parseInt(
  process.env.MEMORY_CACHE_TTL_SECONDS || "5",
  10,
);

export async function buildContext(
  conversationId: string,
  organizationId: string,
  currentMessage: string,
  companyName?: string,
  fallbackToAgent?: boolean,
  collectUserInfo?: CollectUserInfo,
  channel?: "widget" | "email" | "whatsapp" | "telegram",
): Promise<ContextResult> {
  const canFallback = fallbackToAgent !== false;
  let knownVisitorDetails: KnownVisitorDetails | undefined;

  // Short suffix so concurrent jobs don't collide in the console
  const cid = conversationId.slice(-8);
  const t = (label: string) => `[${cid}] ${label}`;

  console.log(`[Context] Building context for conversation: ${conversationId}`);
  console.log(`[Context] organizationId : ${organizationId}`);
  console.log(`[Context] channel        : ${channel ?? "widget"}`);
  console.log(`[Context] companyName    : ${companyName || "(not set)"}`);
  console.log(`[Context] messageLength  : ${currentMessage.length} chars`);

  // ── HISTORY (cached fetch) ─────────────────────────────────────────────────
  // Redis cache (5s TTL) avoids MongoDB round-trip on rapid follow-up messages.
  console.log(`[History] Fetching history for conversation: ${conversationId}`);
  console.time(t("history"));
  const memoryCacheKey = `org:${organizationId}:conv:${conversationId}:memory:${HISTORY_LIMIT}`;
  const historyPromise = (async () => {
    // 1. Try Redis cache first
    try {
      const cached = await cacheRedis.get(memoryCacheKey);
      if (cached) {
        console.log(`[History] CACHE HIT for conversation: ${conversationId}`);
        return JSON.parse(cached);
      }
    } catch {
      // Cache read failed — fall through to API
    }

    // 2. Fall back to gateway API
    try {
      const response = await internalApi.get(
        `/conversations/ai/${conversationId}/memory`,
        { params: { organizationId, limit: HISTORY_LIMIT } }
      );
      // Write to cache (non-blocking)
      cacheRedis
        .setex(memoryCacheKey, MEMORY_CACHE_TTL_SECONDS, JSON.stringify(response.data))
        .catch(() => undefined);
      return response.data;
    } catch (err: any) {
      console.warn(
        "[Context] Failed to fetch conversation history via API:",
        err.message || err,
      );
      return null;
    }
  })();

  // ── AWAIT HISTORY ──────────────────────────────────────────────────────────
  const history: ContextMessage[] = [];
  try {
    const data = await historyPromise;
    console.timeEnd(t("history"));
    if (data) {
      const apiMemory = data?.data?.memory || data?.memory || [];
      const visitor = data?.data?.visitor || data?.visitor || {};
      knownVisitorDetails = {
        name: visitor.name,
        email: visitor.email,
      };

      console.log(
        `[History] Fetch complete. ${apiMemory.length} message(s) for conversation ${conversationId}`,
      );

      for (const m of apiMemory) {
        const role = m.role === "user" ? "user" : "assistant";
        history.push({
          role,
          content: m.content as string,
          timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
        });
        console.log(
          `  [History] ${role.padEnd(9)} | ${String(m.content)
            .replace(/\b\d{6}\b/g, "[6-digit verification code]")
            .slice(0, 80)
            .replace(/\n/g, " ")}`,
        );
      }
    }
  } catch (err: any) {
    console.timeEnd(t("history"));
    console.warn(
      "[Context] Failed to process conversation history:",
      err.message || err,
    );
  }

  // ── PROMPT ASSEMBLY ───────────────────────────────────────────────────────
  // RAG is no longer injected here — the LLM calls faq_retrieval tool when it
  // needs knowledge context. This saves 3-4s embedding latency on every message.
  console.time(t("prompt:build"));
  const systemPrompt = buildSystemPrompt({
    companyName,
    fallbackToAgent: canFallback,
    collectUserInfo,
    knownVisitorDetails,
    channel,
  });
  console.timeEnd(t("prompt:build"));

  // -- 3. Assemble: history + current user message ------------------------------
  // The gateway saves the visitor message to DB before enqueuing the AI job,
  // so /memory already includes the current message. Check the last history
  // entry — if it matches the current message, don't append a duplicate.
  const lastHistoryMsg = history[history.length - 1];
  const currentAlreadyInHistory =
    lastHistoryMsg &&
    lastHistoryMsg.role === "user" &&
    lastHistoryMsg.content.trim() === currentMessage.trim();

  const allMessages: ContextMessage[] = currentAlreadyInHistory
    ? history
    : [...history, { role: "user", content: currentMessage, timestamp: new Date() }];

  console.log(`[History] Thread sent to LLM: ${allMessages.length} turn(s)`);

  return {
    systemPrompt,
    messages: allMessages,
    turnCount: allMessages.length,
  };
}
