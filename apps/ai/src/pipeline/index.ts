import { buildContext } from "../context";
import { getDefaultProvider } from "../llm";
import { LLMMessage } from "../llm/types";
import { publishResponse, publishEscalation } from "../publisher";
import { AIJobData } from "./types";

/**
 * Regex that matches the escalation sentinel the LLM outputs when it decides
 * a human agent should take over.  The full response must be ONLY this marker.
 *
 *   [ESCALATE: <reason text>]
 */
const ESCALATE_RE = /^\s*\[ESCALATE:\s*(.+?)\]\s*$/i;

/**
 * Core AI pipeline — runs for every incoming BullMQ job.
 *
 * Stages (extend here as the product grows):
 *  1. Context   — build conversation history + system prompt (RAG included)
 *  2. LLM       — call the active provider (Gemini, OpenAI, etc.)
 *  3. Route     — detect [ESCALATE] sentinel → hand off to human, or reply normally
 *  4. Tools     — (TODO) parse & execute any function-call responses
 *  5. MCP       — (TODO) invoke MCP server actions
 *  6. Publish   — push the final response to Redis Pub/Sub → API → Socket.IO
 *
 * Edge cases handled:
 *  A. No team / no agents configured   → AI always replies, escalation disabled
 *  B. LLM outputs [ESCALATE: reason]   → publish escalation event; consumer assigns agent
 *  C. Escalation requested but no team → publish polite "can't help further" message
 *  D. LLM provider throws              → publish graceful error message, never silent
 */
export async function runPipeline(job: AIJobData): Promise<void> {
  const { conversationId, content } = job;

  console.log(`\n[Pipeline] ─── NEW JOB ───────────────────────────────────`);
  console.log(`[Pipeline] conversationId : ${conversationId}`);
  console.log(`[Pipeline] messageId      : ${job.messageId}`);
  console.log(`[Pipeline] teamId         : ${job.teamId ?? "none (AI-only mode)"}`);
  console.log(`[Pipeline] content        : ${content.slice(0, 120).replace(/\n/g, " ")}`);

  // ── 1. Context ──────────────────────────────────────────────────────────────
  const context = await buildContext(
    conversationId,
    content,
    job.teamId,
    job.companyName,
    job.messageId,
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
    response = await provider.generate(messages);
  } catch (providerErr) {
    // Edge case D: LLM provider failure — never leave the user with silence
    console.error("[Pipeline] LLM provider threw an error:", providerErr);
    const fallback =
      "I'm sorry — I'm having trouble connecting right now. Please try again in a moment." +
      (context.hasTeam
        ? " If you need immediate help, I can connect you to a human agent."
        : "");
    await publishResponse({ conversationId, content: fallback });
    return;
  }

  console.log(`[Pipeline] raw LLM response: ${response.slice(0, 200).replace(/\n/g, " ")}`);

  // ── 4. Route: check for escalation sentinel ──────────────────────────────────
  const escalateMatch = response.trim().match(ESCALATE_RE);

  if (escalateMatch) {
    const reason = escalateMatch[1].trim();
    console.log(`[Pipeline] ⬆  Escalation detected — reason: "${reason}"`);

    if (context.hasTeam) {
      // Edge case B: AI wants to escalate and a team is available
      await publishEscalation({
        conversationId,
        teamId: job.teamId ?? null,
        reason,
      });
    } else {
      // Edge case C: AI wants to escalate but no human agents are configured
      console.log("[Pipeline] Escalation blocked — no team configured; sending fallback.");
      await publishResponse({
        conversationId,
        content:
          "I wasn't able to fully resolve this. Unfortunately I don't have a human team available right now, " +
          "but I'd recommend reaching out through another support channel or trying again later.",
      });
    }
    return; // Do NOT also publish a regular AI response
  }

  // ── 5. Tools / MCP execution (placeholder) ───────────────────────────────────
  // const tools = getAllTools();
  // if (tools.length > 0) { ... parse function call, execute, re-run LLM }

  // ── 6. Publish regular response ──────────────────────────────────────────────
  await publishResponse({ conversationId, content: response });
}
