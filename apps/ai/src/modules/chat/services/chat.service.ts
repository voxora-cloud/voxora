import { buildContext } from "./context-builder.service";
import { getDefaultProvider } from "../../../infrastructure/providers/llm";
import { LLMMessage } from "../../../infrastructure/providers/llm/types";
import { publishResponse, publishEscalation, publishResolution, publishStreamChunk } from "../../../infrastructure/queue/reply.queue";
import { AIJobData } from "../chat.types";
import { getAllTools } from "../../agents/tools";

/**
 * Regex that matches the escalation sentinel anywhere in the LLM response.
 *   [ESCALATE: <reason text>]
 */
const ESCALATE_RE = /\[ESCALATE:\s*(.+?)\]/i;

/**
 * Regex that matches the resolution sentinel anywhere in the LLM response.
 *   [RESOLVE: <reason text>]
 */
const RESOLVE_RE = /\[RESOLVE:\s*(.+?)\]/i;

/**
 * Core AI pipeline — runs for every incoming BullMQ job.
 *
 * Stages (extend here as the product grows):
 *  1. Context   — build conversation history + system prompt (RAG included)
 *  2. LLM       — call the active provider (Gemini, OpenAI, etc.)
 *  3. Route     — detect [ESCALATE] sentinel → hand off to human, or reply normally
 *  4. Tools     — parse & execute any function-call responses
 *  5. MCP       — invoke MCP server actions
 *  6. Publish   — push the final response to Redis Pub/Sub → API → Socket.IO
 *
 * Config-driven behaviour:
 *  A. No team / no agents configured   → AI always replies, escalation disabled
 *  B. fallbackToAgent === false         → escalation rules never injected; AI handles all
 *  C. LLM outputs [ESCALATE: reason]   → publish escalation event; consumer assigns agent
 *  D. Escalation requested but no team → publish polite "can't help further" message
 *  E. LLM provider throws              → publish graceful error message, never silent
 */
export async function runPipeline(job: AIJobData): Promise<void> {
  const { conversationId, content } = job;

  console.log(`\n[Pipeline] ─── NEW JOB ───────────────────────────────────────`);
  console.log(`[Pipeline] conversationId : ${conversationId}`);
  console.log(`[Pipeline] messageId      : ${job.messageId}`);
  console.log(`[Pipeline] organizationId : ${job.organizationId}`);
  console.log(`[Pipeline] teamId         : ${job.teamId ?? "(none)"}`);
  console.log(`[Pipeline] fallbackToAgent: ${job.fallbackToAgent ?? true}`);
  console.log(`[Pipeline] collectUserInfo: ${JSON.stringify(job.collectUserInfo ?? {})}`);
  console.log(`[Pipeline] content        : ${content.slice(0, 120).replace(/\n/g, " ")}`);

  // ── 1. Context ──────────────────────────────────────────────────────────────
  const context = await buildContext(
    conversationId,
    job.organizationId,
    content,
    job.companyName,
    job.messageId,
    job.teamId,
    job.fallbackToAgent,
    job.collectUserInfo,
  );

  console.log(`[Pipeline] hasTeam        : ${context.hasTeam}`);
  console.log(`[Pipeline] turnCount      : ${context.turnCount}`);

  // ── 2. Build message thread for LLM ─────────────────────────────────────────
  const messages: LLMMessage[] = [
    { role: "system", content: context.systemPrompt },
    ...context.messages.map((m) => ({
      role: m.role as LLMMessage["role"],
      content: m.content,
    })),
  ];

  // ── 3. Generate response ─────────────────────────────────────────────────────
  let response: string;
  try {
    const provider = getDefaultProvider();
    response = await provider.generate(messages, {
      tools: getAllTools(),
      toolContext: {
        organizationId: job.organizationId,
        conversationId: job.conversationId,
        messageId: job.messageId,
      },
      onStream: (chunk, isThought = false) => {
        // Fire-and-forget publish
        publishStreamChunk({ conversationId, chunk, isThought }).catch((err) =>
          console.error("[Pipeline] Stream publish failed:", err.message)
        );
      }
    });
  } catch (providerErr) {
    // Edge case E: LLM provider failure — never leave the user with silence
    console.error("[Pipeline] LLM provider threw an error:", providerErr);
    const canEscalate = context.hasTeam && job.fallbackToAgent !== false;
    const fallback =
      "I'm sorry — I'm having trouble connecting right now. Please try again in a moment." +
      (canEscalate
        ? " If you need immediate help, I can connect you to a human agent."
        : "");
    await publishResponse({ conversationId, content: fallback });
    return;
  }

  console.log(`[Pipeline] raw LLM response: ${response.slice(0, 200).replace(/\n/g, " ")}`);

  // ── 4. Route: check for escalation or resolution sentinels ─────────────────
  const escalateMatch = response.match(ESCALATE_RE);
  const resolveMatch = !escalateMatch && response.match(RESOLVE_RE);

  /**
   * Strip the sentinel token from the response and return any remaining text.
   */
  function stripSentinel(text: string, re: RegExp): string {
    return text.replace(re, "").replace(/\n{3,}/g, "\n\n").trim();
  }

  if (resolveMatch) {
    const reason = resolveMatch[1].trim();
    console.log(`[Pipeline] ✅ Resolution detected — reason: "${reason}"`);
    const humanText = stripSentinel(response, RESOLVE_RE);
    if (humanText) await publishResponse({ conversationId, content: humanText });
    await publishResolution({ conversationId, reason });
    return;
  }

  if (escalateMatch) {
    const reason = escalateMatch[1].trim();
    console.log(`[Pipeline] ⬆  Escalation detected — reason: "${reason}"`);
    const humanText = stripSentinel(response, ESCALATE_RE);

    // Safety guard: if fallbackToAgent was disabled in config the AI shouldn't
    // have emitted [ESCALATE], but handle it defensively anyway.
    const canEscalate = context.hasTeam && job.fallbackToAgent !== false;

    if (canEscalate) {
      if (humanText) await publishResponse({ conversationId, content: humanText });
      await publishEscalation({
        conversationId,
        teamId: job.teamId ?? null,
        reason,
      });
    } else {
      console.log("[Pipeline] Escalation blocked — fallbackToAgent disabled or no team; sending fallback.");
      await publishResponse({
        conversationId,
        content:
          "I wasn't able to fully resolve this. Unfortunately I'm not able to connect you to a human agent right now, " +
          "but please try again or reach out through another support channel.",
      });
    }
    return;
  }

  // ── 5. Tools / MCP execution (placeholder) ───────────────────────────────────
  // const tools = getAllTools();
  // if (tools.length > 0) { ... parse function call, execute, re-run LLM }

  // ── 6. Publish regular response ──────────────────────────────────────────────
  await publishResponse({ conversationId, content: response });
}
