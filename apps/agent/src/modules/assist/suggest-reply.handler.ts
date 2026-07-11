import { FallbackRouter } from "../../infrastructure/providers/routing/fallback-router";
import { LLMMessage } from "../../infrastructure/providers/types/ai.types";
import { AssistMessage, AssistRequestBody } from "./types";

function normalizeMessages(
  messages: AssistRequestBody["messages"],
): LLMMessage[] {
  return (messages || [])
    .filter(
      (message): message is AssistMessage & { content: string } =>
        typeof message?.content === "string" &&
        message.content.trim().length > 0,
    )
    .slice(-12)
    .map((message) => ({
      role:
        message.role === "assistant" ||
          message.role === "ai" ||
          message.role === "agent"
          ? ("assistant" as const)
          : ("user" as const),
      content: message.content.trim(),
    }));
}

function parseSuggestions(text: string): string[] {
  const trimmed = text.trim();

  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 3);
    }
  } catch {
    // Fall through to line-based parsing.
  }

  return trimmed
    .split(/\n+/)
    .map((line) => line.replace(/^[-*\d.)\s"]+|["\s]+$/g, "").trim())
    .filter(Boolean)
    .slice(0, 3);
}

export async function suggestReply(
  body: AssistRequestBody,
): Promise<{ suggestions: string[] }> {
  if (!body.conversationId || !body.organizationId) {
    throw new Error("conversationId and organizationId are required");
  }

  const conversationMessages = normalizeMessages(body.messages);
  if (conversationMessages.length === 0) {
    throw new Error("At least one message is required");
  }

  const messages: LLMMessage[] = [
    {
      role: "system" as const,
      content:
        "You are a support agent assistant. Based on the conversation below, suggest 3 short reply options, each no more than 2 sentences. Return only a JSON array of 3 strings.",
    },
    ...conversationMessages,
  ];

  const result = await FallbackRouter.generate(messages, {
    temperature: 0.4,
    maxTokens: 320,
  });

  const suggestions = parseSuggestions(result.text);
  return { suggestions };
}
