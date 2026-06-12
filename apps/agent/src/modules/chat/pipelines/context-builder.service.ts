import { ContextResult, ContextMessage } from "../chat.types";
import { vectorStore } from "../../../infrastructure/vector";
import config from "../../../config";
import { getEmbeddingProvider } from "../../../infrastructure/providers/embedding";
import { internalApi } from "../../../infrastructure/api/internal.client";
import { buildSystemPrompt } from "./system-prompt.builder";
import type {
  CollectUserInfo,
  KnownVisitorDetails,
} from "./system-prompt.builder";

const HISTORY_LIMIT = parseInt(process.env.CHAT_HISTORY_LIMIT || "10", 10);

export async function buildContext(
  conversationId: string,
  organizationId: string,
  currentMessage: string,
  companyName?: string,
  fallbackToAgent?: boolean,
  collectUserInfo?: CollectUserInfo,
): Promise<ContextResult> {
  const canFallback = fallbackToAgent !== false;
  let knowledgeContext: string | undefined;
  let knownVisitorDetails: KnownVisitorDetails | undefined;

  console.log(
    `[Context] ------------------------------------------------------`,
  );
  console.log(`[Context] Building context for conversation: ${conversationId}`);
  console.log(`[Context] organizationId : ${organizationId}`);
  console.log(`[Context] companyName    : ${companyName || "(not set)"}`);
  console.log(`[Context] fallbackToAgent: ${canFallback}`);
  console.log(
    `[Context] collectUserInfo: ${JSON.stringify(collectUserInfo ?? {})}`,
  );
  console.log(`[Context] messageLength  : ${currentMessage.length} chars`);

  // -- 1. RAG: search knowledge base for relevant chunks -----------------------
  try {
    console.log(`[Context] Starting RAG search...`);
    const provider = getEmbeddingProvider();
    console.log(
      `[Context] Embedding provider: ${provider.constructor.name}, dimensions: ${provider.dimensions}`,
    );

    const queryVector = await provider.embed(currentMessage);
    console.log(`[Context] Generated query vector (${queryVector.length}d)`);
    console.log(
      `[Context] Vector sample: [${queryVector
        .slice(0, 5)
        .map((v) => v.toFixed(4))
        .join(", ")}...]`,
    );

    console.log(`[Context] Calling vectorStore.search with:`);
    console.log(`[Context]   - organizationId: ${organizationId}`);
    console.log(`[Context]   - topK: ${config.embeddings.ragTopK}`);

    const results = await vectorStore.search(queryVector, {
      organizationId,
      topK: config.embeddings.ragTopK,
    });

    console.log(
      `[Context] OK Search completed, received ${results.length} result(s)`,
    );

    if (results.length > 0) {
      knowledgeContext = results
        .map((r, i) => `[${i + 1}] ${r.payload.text}`)
        .join("\n\n");

      console.log(
        `[Context] OK RAG retrieved ${results.length} chunk(s) successfully`,
      );
      const redactedQuery = currentMessage.replace(
        /\b\d{6}\b/g,
        "[6-digit verification code]",
      );
      console.log(
        `[Context] Query: "${redactedQuery.slice(0, 100)}${currentMessage.length > 100 ? "..." : ""}"`,
      );
      results.forEach((r, i) => {
        console.log(
          `[Context]   [${i + 1}] score=${r.score.toFixed(4)} orgId=${r.payload.organizationId} docId=${r.payload.documentId}`,
        );
        console.log(
          `[Context]       text: ${String(r.payload.text).slice(0, 120).replace(/\n/g, " ")}...`,
        );
      });

      console.log(
        `[Context] OK System prompt enhanced with ${results.length} knowledge chunks`,
      );
    } else {
      console.log(`[Context] WARN RAG search returned 0 results`);
      console.log(`[Context]     Possible reasons:`);
      console.log(
        `[Context]     1. No documents ingested for organizationId: ${organizationId}`,
      );
      console.log(
        `[Context]     2. Query doesn't semantically match indexed content`,
      );
      console.log(
        `[Context]     3. Qdrant collection empty or not created yet`,
      );
    }
  } catch (err: any) {
    console.error(`[Context] ERROR RAG search error:`);
    console.error(
      `[Context]    Error type: ${err?.constructor?.name || typeof err}`,
    );
    console.error(`[Context]    Status: ${err?.status}`);
    console.error(`[Context]    Message: ${err?.message || String(err)}`);

    // Check if error is due to missing collection (404 on fresh deployment)
    if (
      err?.status === 404 &&
      err?.data?.status?.error?.includes("doesn't exist")
    ) {
      console.log(
        `[Context] WARN Qdrant collection doesn't exist yet - creating with ${getEmbeddingProvider().dimensions}d vectors`,
      );
      try {
        await vectorStore.ensureCollection(getEmbeddingProvider().dimensions);
        console.log(
          `[Context] OK Collection created successfully. RAG will work after documents are ingested.`,
        );
      } catch (createErr) {
        console.error(
          "[Context] ERROR Failed to create collection:",
          createErr,
        );
      }
    } else {
      console.error(
        "[Context] WARN RAG search failed, continuing without context",
      );
      if (err?.stack) {
        console.error(`[Context] Stack trace: ${err.stack}`);
      }
    }
  }

  // -- 2. Conversation history from API ----------------------------------------
  const history: ContextMessage[] = [];
  try {
    console.log(
      `[History] Fetching history from API for conversation: ${conversationId}`,
    );
    console.log(`[History] HISTORY_LIMIT: ${HISTORY_LIMIT}`);

    const response = await internalApi.get(
      `/conversations/ai/${conversationId}/memory`,
      { params: { organizationId, limit: HISTORY_LIMIT } },
    );

    const apiMemory = response.data?.data?.memory || [];
    const visitor = response.data?.data?.visitor || {};
    knownVisitorDetails = {
      name: visitor.name,
      email: visitor.email,
    };

    console.log(
      `[History] API returned ${apiMemory.length} message(s) for conversation ${conversationId}`,
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
  } catch (err: any) {
    console.warn(
      "[Context] Failed to fetch conversation history via API:",
      err.message || err,
    );
  }

  const systemPrompt = buildSystemPrompt({
    companyName,
    fallbackToAgent: canFallback,
    collectUserInfo,
    knowledgeContext,
    knownVisitorDetails,
  });

  // -- 3. Assemble: history + current user message ------------------------------
  const allMessages: ContextMessage[] = [
    ...history,
    { role: "user", content: currentMessage, timestamp: new Date() },
  ];

  console.log(`[History] Thread sent to LLM: ${allMessages.length} turn(s)`);
  allMessages.forEach((m, i) =>
    console.log(
      `  [LLM turn ${i + 1}] ${m.role.padEnd(9)} | ${m.content
        .replace(/\b\d{6}\b/g, "[6-digit verification code]")
        .slice(0, 100)
        .replace(/\n/g, " ")}`,
    ),
  );

  return {
    systemPrompt,
    messages: allMessages,
    turnCount: allMessages.length,
  };
}
