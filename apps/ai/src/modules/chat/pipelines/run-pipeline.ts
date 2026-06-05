import { buildContext } from "./context-builder.service";
import { getDefaultProvider } from "../../../infrastructure/providers/llm";
import { LLMMessage } from "../../../infrastructure/providers/llm/types";
import { publishResponse } from "../../../infrastructure/queue/reply.queue";
import { AIJobData } from "../chat.types";
import { getTool, getToolsForContext } from "../../agents/tools";
import { getConversationGate } from "../../../infrastructure/cache";
import { publishStreamWithSeq } from "../services/stream.service";

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

  const gate = await getConversationGate(conversationId, job.organizationId);
  if (shouldSkipConversation(gate)) {
    console.log(
      `[Pipeline] Skipping job - conversation ${conversationId} already escalated/closed/assigned`,
    );
    return;
  }

  console.log(`\n[Pipeline] --- NEW JOB ----------------------------------------`);
  console.log(`[Pipeline] conversationId : ${conversationId}`);
  console.log(`[Pipeline] messageId      : ${job.messageId}`);
  console.log(`[Pipeline] organizationId : ${job.organizationId}`);
  console.log(`[Pipeline] fallbackToAgent: ${job.fallbackToAgent ?? true}`);
  console.log(`[Pipeline] collectUserInfo: ${JSON.stringify(job.collectUserInfo ?? {})}`);
  console.log(`[Pipeline] content        : ${redactOtpForLog(content).slice(0, 120).replace(/\n/g, " ")}`);

  let verifiedIdentityEmail: string | null = null;
  const otpCode = exactOtpCode(content);
  if (otpCode) {
    const verifyTool = getTool("verify_email_otp");
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
      return;
    }
  }

  // -- 1. Context -------------------------------------------------------------
  const context = await buildContext(
    conversationId,
    job.organizationId,
    content,
    job.companyName,
    job.fallbackToAgent,
    job.collectUserInfo,
  );
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
  let usage:
    | {
        promptTokens?: number;
        completionTokens?: number;
        totalTokens?: number;
      }
    | undefined;
  try {
    const provider = getDefaultProvider();
    const generated = await provider.generate(messages, {
      tools: getToolsForContext({ fallbackToAgent: job.fallbackToAgent }),
      toolContext: {
        organizationId: job.organizationId,
        conversationId: job.conversationId,
        messageId: job.messageId,
      },
      onStream: (chunk, isThought = false) => {
        publishStreamWithSeq({
          conversationId,
          messageId: job.messageId,
          chunk,
          isThought,
        }).catch((err) =>
          console.error("[Pipeline] Stream publish failed:", err.message),
        );
      },
    });
    generatedText = generated.text;
    usage = generated.usage;
  } catch (providerErr) {
    console.error("[Pipeline] LLM provider threw an error:", providerErr);
    const canEscalate = job.fallbackToAgent !== false;
    const fallback =
      "I'm sorry - I'm having trouble connecting right now. Please try again in a moment." +
      (canEscalate
        ? " If you need immediate help, I can connect you to a human agent."
        : "");
    await publishResponse({ conversationId, content: fallback });
    return;
  }

  console.log(
    `[Pipeline] raw LLM response: ${generatedText.slice(0, 200).replace(/\n/g, " ")}`,
  );

  // -- 4. Publish regular response ---------------------------------------------
  await publishResponse({ conversationId, content: generatedText, usage });
}
