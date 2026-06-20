import { buildContext } from "./context-builder.service";
import { getDefaultProvider } from "../../../infrastructure/providers/llm";
import { LLMMessage } from "../../../infrastructure/providers/llm/types";
import { publishResponse } from "../../../infrastructure/queue/reply.queue";
import { AIJobData } from "../chat.types";
import { getTool, getToolsForContext } from "../../agents/tools";
import { getConversationGate } from "../../../infrastructure/cache";
import { publishStreamWithSeq } from "../services/stream.service";
import { internalApi } from "../../../infrastructure/api/internal.client";
import { getEmbeddingProvider } from "../../../infrastructure/providers/embedding";
import { vectorStore } from "../../../infrastructure/vector";

function shouldSkipConversation(gate: {
  status?: string;
  assignedTo?: string | null;
  metadata?: { escalatedAt?: string | null; humanJoinedAt?: string | null };
} | null): boolean {
  if (!gate) return false;
  if (gate.metadata?.escalatedAt || gate.metadata?.humanJoinedAt || gate.assignedTo) {
    return true;
  }
  return ["active", "resolved", "closed"].includes(gate.status || "");
}

function exactOtpCode(content: string): string | null {
  const normalized = content.trim().replace(/\s/g, "");
  return /^\d{6}$/.test(normalized) ? normalized : null;
}

function redactOtpForLog(content: string): string {
  return content.replace(/\b\d{6}\b/g, "[6-digit verification code]");
}

export async function runPipeline(job: AIJobData): Promise<void> {
  const { conversationId, content } = job;

  // Short suffix used as a unique label for console.time so concurrent jobs don't collide
  const cid = conversationId.slice(-8);
  const t = (label: string) => `[${cid}] ${label}`;

  // ── TOTAL pipeline timer ──────────────────────────────────────────────────
  console.time(t("total"));

  // ── GATE CHECK ────────────────────────────────────────────────────────────
  console.time(t("gate:cache"));
  const gate = await getConversationGate(conversationId, job.organizationId);
  console.timeEnd(t("gate:cache"));

  if (shouldSkipConversation(gate)) {
    console.log(
      `[Pipeline] Skipping job - conversation ${conversationId} already escalated/closed/assigned`,
    );
    console.timeEnd(t("total"));
    return;
  }

  console.log(`\n[Pipeline] --- NEW JOB ----------------------------------------`);
  console.log(`[Pipeline] conversationId : ${conversationId}`);
  console.log(`[Pipeline] messageId      : ${job.messageId}`);
  console.log(`[Pipeline] organizationId : ${job.organizationId}`);
  console.log(`[Pipeline] channel        : ${job.channel ?? "widget"}`);
  console.log(`[Pipeline] fallbackToAgent: ${job.fallbackToAgent ?? true}`);
  console.log(`[Pipeline] collectUserInfo: ${JSON.stringify(job.collectUserInfo ?? {})}`);
  console.log(`[Pipeline] content        : ${redactOtpForLog(content).slice(0, 120).replace(/\n/g, " ")}`);

  const startTime = Date.now();
  const steps: any[] = [];
  let status: "success" | "failed" = "success";
  let error: string | undefined;
  let usage: any;

  // ── OTP CHECK ─────────────────────────────────────────────────────────────
  let verifiedIdentityEmail: string | null = null;
  const otpCode = exactOtpCode(content);
  if (otpCode) {
    console.time(t("otp:verify"));
    const verifyTool = getTool("verify_email_otp");
    const stepTimestamp = new Date();
    const verification = verifyTool
      ? (await verifyTool.execute(
          { code: otpCode },
          {
            organizationId: job.organizationId,
            conversationId: job.conversationId,
            messageId: job.messageId,
          },
        )) as { status?: string; verified?: boolean; email?: string | null; message?: string }
      : { status: "error", verified: false, message: "OTP verifier is unavailable" };
    console.timeEnd(t("otp:verify"));

    steps.push({
      toolName: "verify_email_otp",
      args: { code: otpCode },
      result: verification,
      error: verification.status === "error" ? verification.message : undefined,
      timestamp: stepTimestamp,
    });

    if (verification.verified === true) {
      verifiedIdentityEmail = verification.email || null;
    } else if (verification.message !== "No active verification code found") {
      let reply = "That verification code did not match. Please check the latest code in your email and try again.";
      if (verification.message?.includes("expired")) {
        reply = "That verification code has expired. Please request a new code and try again.";
      } else if (verification.message?.includes("Too many attempts")) {
        reply = "Too many verification attempts were made. Please request a new code and try again.";
      } else if (verification.message && verification.message !== "Invalid OTP") {
        reply = "I could not verify that code right now. Please try again in a moment.";
      }
      await publishResponse({ conversationId, content: reply });

      // Save run logs on early return
      try {
        const duration = Date.now() - startTime;
        await internalApi.post(`/conversations/ai/${conversationId}/agent-runs`, {
          organizationId: job.organizationId,
          messageId: job.messageId,
          steps,
          duration,
          status,
          error,
          usage,
        });
      } catch (apiErr: any) {
        console.error("[Pipeline] Failed to save agent run logs:", apiErr.message);
      }
      console.timeEnd(t("total"));
      return;
    }
  }

  // ── FAQ SEMANTIC BYPASS ───────────────────────────────────────────────────
  let faqMatched = false;
  let queryVector: number[] | undefined;
  if (!otpCode) {
    try {
      const embeddingProvider = getEmbeddingProvider();

      console.time(t("embed:faq"));
      queryVector = await embeddingProvider.embed(content.trim());
      console.timeEnd(t("embed:faq"));

      console.time(t("qdrant:faq"));
      const results = await vectorStore.search(queryVector, {
        organizationId: job.organizationId,
        topK: 1,
        type: "faq",
      });
      console.timeEnd(t("qdrant:faq"));

      if (results.length > 0) {
        const match = results[0];
        if (match.score >= 0.85) {
          const faqAnswer = (match.payload as any)?.answer || (match.payload as any)?.content || "";
          if (faqAnswer) {
            console.log(`[Pipeline] FAQ semantic match found (score: ${match.score.toFixed(4)}) - Bypassing AI LLM pipeline`);
            faqMatched = true;

            // Publish response
            await publishResponse({ conversationId, content: faqAnswer });

            // Save run logs
            const duration = Date.now() - startTime;
            steps.push({
              toolName: "faq_semantic_bypass",
              args: { query: content },
              result: {
                score: match.score,
                question: (match.payload as any)?.question,
                answer: faqAnswer,
              },
              timestamp: new Date(),
            });

            try {
              await internalApi.post(`/conversations/ai/${conversationId}/agent-runs`, {
                organizationId: job.organizationId,
                messageId: job.messageId,
                steps,
                duration,
                status: "success",
                usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
              });
            } catch (apiErr: any) {
              console.error("[Pipeline] Failed to save agent run logs:", apiErr.message);
            }

            console.timeEnd(t("total"));
            return;
          }
        }
      }
    } catch (faqErr: any) {
      console.error("[Pipeline] FAQ semantic search failed:", faqErr.message);
    }
  }

  // If FAQ did not match and AI is disabled/subscription is expired: escalate
  const isAiEnabled = job.aiEnabled !== false;
  const isSubActive = job.subscriptionExpired !== true;

  if (!isAiEnabled || !isSubActive) {
    console.log(`[Pipeline] AI is disabled/expired (aiEnabled: ${isAiEnabled}, subActive: ${isSubActive}) and no FAQ matched. Escalating conversation ${conversationId}`);
    try {
      await internalApi.post(`/conversations/ai/${conversationId}/escalate`, {
        organizationId: job.organizationId,
        reason: !isSubActive
          ? "Subscription expired — auto-escalated to human"
          : "AI disabled — auto-escalated to human",
      });
    } catch (escErr: any) {
      console.error("[Pipeline] Failed to escalate conversation on AI disabled/expired:", escErr.message);
    }
    console.timeEnd(t("total"));
    return;
  }

  try {
    // -- 1. Context -------------------------------------------------------------
    console.time(t("agent"));
    console.time(t("context:build"));
    const context = await buildContext(
      conversationId,
      job.organizationId,
      content,
      job.companyName,
      job.fallbackToAgent,
      job.collectUserInfo,
      job.channel,
      queryVector,
    );
    console.timeEnd(t("context:build"));

    if (verifiedIdentityEmail) {
      const verifiedCodePattern = new RegExp(`\\b${otpCode}\\b`, "g");
      context.messages = context.messages.map((message) => ({
        ...message,
        content: message.content.replace(verifiedCodePattern, "[verified code omitted]"),
      }));
      context.systemPrompt += `

    <runtime_identity_verification>
      The visitor successfully verified the one-time email code in this turn for ${verifiedIdentityEmail}.
      Inform them briefly that verification succeeded, then continue the pending account-related request using available tools.
      Do NOT request or verify another code for this email unless the visitor changes account identity or explicitly requests a new verification.
    </runtime_identity_verification>`;
    }

    console.log(`[Pipeline] turnCount      : ${context.turnCount}`);

    // -- 2. Build message thread for LLM ----------------------------------------
    const messages: LLMMessage[] = [
      { role: "system", content: context.systemPrompt },
      ...context.messages.map((m) => ({
        role: m.role as LLMMessage["role"],
        content: m.content,
      })),
    ];

    // -- 3. Generate response ----------------------------------------------------
    let generatedText: string;
    try {
      const provider = getDefaultProvider();
      const capabilities = await provider.getCapabilities();

      console.time(t("llm"));
      const llmStart = performance.now();
      let hasReceivedFirstToken = false;

      const generated = await provider.generate(messages, {
        tools: capabilities.supportsTools
          ? getToolsForContext({ fallbackToAgent: job.fallbackToAgent, channel: job.channel })
          : [],
        toolContext: {
          organizationId: job.organizationId,
          conversationId: job.conversationId,
          messageId: job.messageId,
        },
        onStream: capabilities.supportsStreaming
          ? (chunk, isThought = false) => {
              if (!hasReceivedFirstToken) {
                hasReceivedFirstToken = true;
                const ttftPipeline = Date.now() - startTime;
                const ttftLlm = performance.now() - llmStart;
                console.log(
                  `[${cid}] ttft: ${ttftPipeline.toFixed(2)}ms (from request) | llm_ttft: ${ttftLlm.toFixed(2)}ms (from LLM start) (isThought=${isThought})`,
                );
              }
              publishStreamWithSeq({
                conversationId,
                messageId: job.messageId,
                chunk,
                isThought,
              }).catch((err) =>
                console.error("[Pipeline] Stream publish failed:", err.message),
              );
            }
          : undefined,
      });
      console.timeEnd(t("llm"));
      console.timeEnd(t("agent"));

      generatedText = generated.text;
      usage = generated.usage;
      if (generated.steps) {
        steps.push(...generated.steps);
      }
    } catch (providerErr) {
      console.error("[Pipeline] LLM provider threw an error:", providerErr);
      const canEscalate = job.fallbackToAgent !== false;
      const fallback =
        "I'm sorry - I'm having trouble connecting right now. Please try again in a moment." +
        (canEscalate
          ? " If you need immediate help, I can connect you to a human agent."
          : "");
      await publishResponse({ conversationId, content: fallback });

      if (canEscalate) {
        try {
          await internalApi.post(`/conversations/ai/${conversationId}/escalate`, {
            organizationId: job.organizationId,
            reason: "LLM provider error — auto-escalated to human",
          });
        } catch (escErr: any) {
          console.error("[Pipeline] Failed to escalate conversation on provider error:", escErr.message);
        }
      }

      try { console.timeEnd(t("llm")); } catch {}
      try { console.timeEnd(t("agent")); } catch {}
      status = "failed";
      error = providerErr instanceof Error ? providerErr.message : String(providerErr);
      console.timeEnd(t("total"));
      return;
    }

    console.log(
      `[Pipeline] raw LLM response: ${generatedText.slice(0, 200).replace(/\n/g, " ")}`,
    );

    // -- 4. Publish regular response ---------------------------------------------
    console.time(t("publish:response"));
    await publishResponse({ conversationId, content: generatedText, usage });
    console.timeEnd(t("publish:response"));

  } catch (err: any) {
    status = "failed";
    error = err.message || String(err);
    throw err;
  } finally {
    const duration = Date.now() - startTime;
    console.timeEnd(t("total"));
    try {
      await internalApi.post(`/conversations/ai/${conversationId}/agent-runs`, {
        organizationId: job.organizationId,
        messageId: job.messageId,
        steps,
        duration,
        status,
        error,
        usage,
      });
    } catch (apiErr: any) {
      console.error("[Pipeline] Failed to save agent run logs:", apiErr.message);
    }
  }
}
