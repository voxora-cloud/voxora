import { buildContext } from "./context-builder.service";
import {
  ProviderFactory,
  FallbackRouter,
} from "../../../infrastructure/providers";
import { LLMMessage } from "../../../infrastructure/providers/types/ai.types";
import { publishResponse } from "../../../infrastructure/queue/reply.queue";
import { AIJobData } from "../chat.types";
import { getTool, getToolsForContext } from "../../agents/tools";
import { getConversationGate } from "../../../infrastructure/cache";
import { publishStreamWithSeq, waitForPendingStream } from "../services/stream.service";
import { internalApi } from "../../../infrastructure/api/internal.client";
import { vectorStore } from "../../../infrastructure/vector";

// ── FAQ pre-filter ─────────────────────────────────────────────────────────
// Skip the FAQ embedding+search for messages that are clearly not questions.
// This saves 3-4s of Bedrock embedding latency on casual messages.
const FAQ_SKIP_WORDS =
  /^(ok|okay|sure|yes|no|yeah|nope|yep|alright|thanks|thank you|thx|ty|cool|nice|great|awesome|bye|goodbye|got it|understood|sounds good|right|exactly|perfect|gotcha|hey|hi|hello|yo|sup|howdy|greetings)\b/i;
const FAQ_QUESTION_STARTERS =
  /^(what|who|where|when|why|how|which|can|could|would|should|is|are|do|does|did|will|may|might|tell me|explain|show me|help me|i need|i want|how to)\b/i;
const FAQ_MIN_LENGTH = 10;

function isLikelyQuestion(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length < FAQ_MIN_LENGTH) return false;
  if (FAQ_SKIP_WORDS.test(trimmed)) return false;
  if (trimmed.includes("?")) return true;
  if (FAQ_QUESTION_STARTERS.test(trimmed)) return true;
  return false;
}

function shouldSkipConversation(
  gate: {
    status?: string;
    assignedTo?: string | null;
    metadata?: { escalatedAt?: string | null; humanJoinedAt?: string | null };
  } | null,
): boolean {
  if (!gate) return false;
  if (
    gate.metadata?.escalatedAt ||
    gate.metadata?.humanJoinedAt ||
    gate.assignedTo
  ) {
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

  console.log(
    `\n[Pipeline] --- NEW JOB ----------------------------------------`,
  );
  console.log(`[Pipeline] conversationId : ${conversationId}`);
  console.log(`[Pipeline] messageId      : ${job.messageId}`);
  console.log(`[Pipeline] organizationId : ${job.organizationId}`);
  console.log(`[Pipeline] channel        : ${job.channel ?? "widget"}`);
  console.log(`[Pipeline] fallbackToAgent: ${job.fallbackToAgent ?? true}`);
  console.log(
    `[Pipeline] collectUserInfo: ${JSON.stringify(job.collectUserInfo ?? {})}`,
  );
  console.log(
    `[Pipeline] content        : ${redactOtpForLog(content).slice(0, 120).replace(/\n/g, " ")}`,
  );

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
      ? ((await verifyTool.execute(
          { code: otpCode },
          {
            organizationId: job.organizationId,
            conversationId: job.conversationId,
            messageId: job.messageId,
          },
        )) as {
          status?: string;
          verified?: boolean;
          email?: string | null;
          message?: string;
        })
      : {
          status: "error",
          verified: false,
          message: "OTP verifier is unavailable",
        };
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
      let reply =
        "That verification code did not match. Please check the latest code in your email and try again.";
      if (verification.message?.includes("expired")) {
        reply =
          "That verification code has expired. Please request a new code and try again.";
      } else if (verification.message?.includes("Too many attempts")) {
        reply =
          "Too many verification attempts were made. Please request a new code and try again.";
      } else if (
        verification.message &&
        verification.message !== "Invalid OTP"
      ) {
        reply =
          "I could not verify that code right now. Please try again in a moment.";
      }
      await publishResponse({ conversationId, messageId: job.messageId, content: reply });

      // Save run logs on early return
      try {
        const duration = Date.now() - startTime;
        await internalApi.post(
          `/conversations/ai/${conversationId}/agent-runs`,
          {
            organizationId: job.organizationId,
            messageId: job.messageId,
            steps,
            duration,
            status,
            error,
            usage,
          },
        );
      } catch (apiErr: any) {
        console.error(
          "[Pipeline] Failed to save agent run logs:",
          apiErr.message,
        );
      }
      console.timeEnd(t("total"));
      return;
    }
  }

  // ── FAQ FAST-PATH ────────────────────────────────────────────────────────
  // Check if the message matches a known FAQ (score >= 0.85). If so, return
  // the canned answer immediately — no LLM call needed.
  // Skip for messages that are clearly not questions (saves 3-4s embedding).
  if (!otpCode && isLikelyQuestion(content)) {
    try {
      const embeddingProvider = ProviderFactory.getEmbeddingProvider();

      console.time(t("embed:faq"));
      const queryVector = await embeddingProvider.embed(content.trim(), {
        organizationId: job.organizationId,
        conversationId,
      });
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
          const faqAnswer =
            (match.payload as any)?.answer ||
            (match.payload as any)?.content ||
            "";
          if (faqAnswer) {
            console.log(
              `[Pipeline] FAQ match (score: ${match.score.toFixed(4)}) - returning directly, no LLM`,
            );

            await publishResponse({ conversationId, messageId: job.messageId, content: faqAnswer });

            const duration = Date.now() - startTime;
            steps.push({
              toolName: "faq_fast_path",
              args: { query: content },
              result: {
                score: match.score,
                question: (match.payload as any)?.question,
                answer: faqAnswer,
              },
              timestamp: new Date(),
            });

            try {
              await internalApi.post(
                `/conversations/ai/${conversationId}/agent-runs`,
                {
                  organizationId: job.organizationId,
                  messageId: job.messageId,
                  steps,
                  duration,
                  status: "success",
                  usage: {
                    promptTokens: 0,
                    completionTokens: 0,
                    totalTokens: 0,
                  },
                },
              );
            } catch (apiErr: any) {
              console.error(
                "[Pipeline] Failed to save agent run logs:",
                apiErr.message,
              );
            }

            console.timeEnd(t("total"));
            return;
          }
        }
      }
    } catch (faqErr: any) {
      console.error("[Pipeline] FAQ check failed:", faqErr.message);
    }
  } else if (!otpCode) {
    console.log(
      `[Pipeline] Skipping FAQ check (not a question): "${content.slice(0, 50)}"`,
    );
  }

  // ── AI DISABLED / SUBSCRIPTION EXPIRED CHECK ─────────────────────────────
  const isAiEnabled = job.aiEnabled !== false;
  const isSubActive = job.subscriptionExpired !== true;

  if (!isAiEnabled || !isSubActive) {
    console.log(
      `[Pipeline] AI is disabled/expired (aiEnabled: ${isAiEnabled}, subActive: ${isSubActive}). Escalating conversation ${conversationId}`,
    );
    try {
      await internalApi.post(`/conversations/ai/${conversationId}/escalate`, {
        organizationId: job.organizationId,
        reason: !isSubActive
          ? "Subscription expired — auto-escalated to human"
          : "AI disabled — auto-escalated to human",
      });
    } catch (escErr: any) {
      console.error(
        "[Pipeline] Failed to escalate conversation on AI disabled/expired:",
        escErr.message,
      );
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
      job.messageId,
      job.companyName,
      job.fallbackToAgent,
      job.collectUserInfo,
      job.channel,
    );
    console.timeEnd(t("context:build"));

    if (verifiedIdentityEmail) {
      const verifiedCodePattern = new RegExp(`\\b${otpCode}\\b`, "g");
      context.messages = context.messages.map((message) => ({
        ...message,
        content: message.content.replace(
          verifiedCodePattern,
          "[verified code omitted]",
        ),
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
    const pendingStreamPublishes: Promise<void>[] = [];
    try {
      // Capabilities are resolved from the registry — no string matching
      const provider = ProviderFactory.getLLMProvider();
      const capabilities = await provider.getCapabilities();

      console.time(t("llm"));
      const llmStart = performance.now();
      let hasReceivedFirstToken = false;

      // FallbackRouter wraps generation with an ordered provider fallback chain
      const generated = await FallbackRouter.generate(messages, {
        tools: capabilities.supportsTools
          ? getToolsForContext({
              fallbackToAgent: job.fallbackToAgent,
              channel: job.channel,
            })
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
              const publish = publishStreamWithSeq({
                conversationId,
                messageId: job.messageId,
                chunk,
                isThought,
              }).catch((err) =>
                console.error("[Pipeline] Stream publish failed:", err.message),
              );
              pendingStreamPublishes.push(publish);
            }
          : undefined,
        onToolEvent: (event) => {
          const publish = publishStreamWithSeq({
            conversationId,
            messageId: job.messageId,
            chunk: "",
            isThought: false,
            toolEvent: event,
          }).catch((err) =>
            console.error("[Pipeline] Tool event publish failed:", err.message),
          );
          pendingStreamPublishes.push(publish);
        },
      });
      await Promise.all(pendingStreamPublishes);
      console.timeEnd(t("llm"));
      console.timeEnd(t("agent"));

      generatedText = generated.text;
      usage = generated.usage;
      if (generated.steps) {
        steps.push(...generated.steps);
      }
    } catch (providerErr) {
      console.error("[Pipeline] LLM provider threw an error:", providerErr);
      await Promise.all(pendingStreamPublishes);
      const canEscalate = job.fallbackToAgent !== false;
      const fallback =
        "I'm sorry - I'm having trouble connecting right now. Please try again in a moment." +
        (canEscalate
          ? " If you need immediate help, I can connect you to a human agent."
          : "");
      await waitForPendingStream(conversationId, job.messageId);
      await publishResponse({ conversationId, messageId: job.messageId, content: fallback });

      if (canEscalate) {
        try {
          await internalApi.post(
            `/conversations/ai/${conversationId}/escalate`,
            {
              organizationId: job.organizationId,
              reason: "LLM provider error — auto-escalated to human",
            },
          );
        } catch (escErr: any) {
          console.error(
            "[Pipeline] Failed to escalate conversation on provider error:",
            escErr.message,
          );
        }
      }

      try {
        console.timeEnd(t("llm"));
      } catch {}
      try {
        console.timeEnd(t("agent"));
      } catch {}
      status = "failed";
      error =
        providerErr instanceof Error
          ? providerErr.message
          : String(providerErr);
      console.timeEnd(t("total"));
      return;
    }

    console.log(
      `[Pipeline] raw LLM response: ${generatedText.slice(0, 200).replace(/\n/g, " ")}`,
    );

    // -- 4. Publish regular response ---------------------------------------------
    console.time(t("publish:response"));
    await waitForPendingStream(conversationId, job.messageId);
    await publishResponse({ conversationId, messageId: job.messageId, content: generatedText, usage });
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
      console.error(
        "[Pipeline] Failed to save agent run logs:",
        apiErr.message,
      );
    }
  }
}
