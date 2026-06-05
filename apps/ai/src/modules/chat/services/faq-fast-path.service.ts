import { vectorStore } from "../../../infrastructure/vector";
import { getEmbeddingProvider } from "../../../infrastructure/providers/embedding";
import logger from "../../../utils/logger";

const FAQ_SCORE_THRESHOLD = 0.85;

export interface FaqFastPathResult {
  answer: string;
  score: number;
}

function hasSearchableMessage(message: string): boolean {
  const text = message.trim();
  return Boolean(text);
}

export async function searchFaqFastPathAnswer(params: {
  organizationId: string;
  message: string;
}): Promise<FaqFastPathResult | null> {
  const message = params.message.trim();
  if (!hasSearchableMessage(message)) return null;

  try {
    const queryVector = await getEmbeddingProvider().embed(message);
    const [bestMatch] = await vectorStore.search(queryVector, {
      organizationId: params.organizationId,
      topK: 1,
      type: "faq",
    });

    if (!bestMatch || bestMatch.score < FAQ_SCORE_THRESHOLD) return null;
    if (bestMatch.payload.organizationId !== params.organizationId) return null;
    if (bestMatch.payload.type !== "faq") return null;

    const answer =
      typeof bestMatch.payload.answer === "string"
        ? bestMatch.payload.answer.trim()
        : "";

    if (!answer) return null;

    return { answer, score: bestMatch.score };
  } catch (error) {
    logger.warn("FAQ fast-path failed", {
      organizationId: params.organizationId,
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
