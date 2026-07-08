import { FallbackRouter } from "../../infrastructure/providers/routing/fallback-router";
import { LLMMessage } from "../../infrastructure/providers/types/ai.types";
import { AssistRequestBody } from "./types";

function parseDraftOptions(text: string, limit: number): string[] {
  const trimmed = text.trim();

  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, limit);
    }
  } catch {
    // Fall through to line-based parsing.
  }

  return trimmed
    .split(/\n+/)
    .map((line) => line.replace(/^[-*\d.)\s"]+|["\s]+$/g, "").trim())
    .filter(Boolean)
    .slice(0, limit);
}

export async function assistDraft(
  body: AssistRequestBody,
): Promise<{ options: string[] }> {
  if (!body.conversationId || !body.organizationId) {
    throw new Error("conversationId and organizationId are required");
  }

  const draft = body.draft?.trim();
  if (!draft) {
    throw new Error("Draft message is required");
  }

  const mode = body.mode === "reframe" ? "reframe" : "variations";
  const systemPrompt =
    mode === "reframe"
      ? "You rewrite support-agent draft messages in a professional, clear tone while preserving the exact original meaning. Return only a JSON array with 1 string."
      : "You create alternative support-agent draft messages. Keep the same meaning, make each option clear and professional, and vary wording naturally. Return only a JSON array of 3 strings.";

  const messages: LLMMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: draft },
  ];

  const result = await FallbackRouter.generate(messages, {
    temperature: mode === "reframe" ? 0.25 : 0.55,
    maxTokens: mode === "reframe" ? 220 : 420,
  });

  return { options: parseDraftOptions(result.text, mode === "reframe" ? 1 : 3) };
}
