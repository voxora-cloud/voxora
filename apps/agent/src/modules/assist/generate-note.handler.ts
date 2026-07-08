import { FallbackRouter } from "../../infrastructure/providers/routing/fallback-router";
import { LLMMessage } from "../../infrastructure/providers/types/ai.types";
import { AssistRequestBody } from "./types";

function normalizeMessages(messages: AssistRequestBody["messages"]): LLMMessage[] {
  return (messages || [])
    .filter((message) => typeof message?.content === "string" && message.content.trim())
    .slice(-30)
    .map((message) => ({
      role:
        message.role === "assistant" || message.role === "ai" || message.role === "agent"
          ? "assistant"
          : "user",
      content: message.content!.trim(),
    }));
}

export async function generateNote(body: AssistRequestBody): Promise<{ note: string }> {
  if (!body.conversationId || !body.organizationId) {
    throw new Error("conversationId and organizationId are required");
  }

  const conversationMessages = normalizeMessages(body.messages);
  if (conversationMessages.length === 0) {
    throw new Error("At least one message is required");
  }

  const contactLine = body.contactName
    ? `The contact's name is ${body.contactName}.`
    : "The contact's name is unknown.";

  const messages: LLMMessage[] = [
    {
      role: "system",
      content:
        `You are a CRM assistant. ${contactLine} Summarize the following customer conversation as a concise internal contact note in 2-4 sentences. Focus on what the customer wanted, the outcome, sentiment, and any follow-up action needed. Return only the note text.`,
    },
    ...conversationMessages,
  ];

  const result = await FallbackRouter.generate(messages, {
    temperature: 0.25,
    maxTokens: 360,
  });

  return { note: result.text.trim() };
}