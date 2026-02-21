import { buildContext } from "../context";
import { getDefaultProvider } from "../llm";
import { LLMMessage } from "../llm/types";
import { publishResponse } from "../publisher";
import { AIJobData } from "./types";

/**
 * Core AI pipeline — runs for every incoming BullMQ job.
 *
 * Stages (extend here as the product grows):
 *  1. Context   — build conversation history + system prompt
 *  2. LLM       — call the active provider (Gemini, OpenAI, etc.)
 *  3. Tools     — (TODO) parse & execute any function-call responses
 *  4. MCP       — (TODO) invoke MCP server actions
 *  5. Publish   — push the final response to Redis Pub/Sub → API → Socket.IO
 */
export async function runPipeline(job: AIJobData): Promise<void> {
  const { conversationId, content } = job;

  console.log(`\n[Pipeline] ─── NEW JOB ───────────────────────────────────`);
  console.log(`[Pipeline] conversationId : ${conversationId}`);
  console.log(`[Pipeline] messageId      : ${job.messageId}`);
  console.log(`[Pipeline] content        : ${content.slice(0, 120).replace(/\n/g, " ")}`);

  // ── 1. Context ──────────────────────────────────────────────────────────────
  // Pass messageId so buildContext can exclude the just-saved user message from
  // the history fetch (avoids sending it twice to the LLM as both history and
  // currentMessage).
  const context = await buildContext(conversationId, content, job.teamId, job.companyName, job.messageId);

  // ── 2. Build message thread for LLM ─────────────────────────────────────────
  const messages: LLMMessage[] = [
    { role: "system", content: context.systemPrompt },
    ...context.messages.map((m) => ({
      role: m.role as LLMMessage["role"],
      content: m.content,
    })),
  ];

  // ── 3. Generate response ─────────────────────────────────────────────────────
  const provider = getDefaultProvider();
  const response = await provider.generate(messages);

  // ── 4. Tools / MCP execution (placeholder) ───────────────────────────────────
  // const tools = getAllTools();
  // if (tools.length > 0) { ... parse function call, execute, re-run LLM }

  // ── 5. Publish result ────────────────────────────────────────────────────────
  await publishResponse({ conversationId, content: response });
}
