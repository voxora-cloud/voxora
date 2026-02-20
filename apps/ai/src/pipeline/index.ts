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

  // ── 1. Context ──────────────────────────────────────────────────────────────
  const context = await buildContext(conversationId, content, job.teamId);

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
