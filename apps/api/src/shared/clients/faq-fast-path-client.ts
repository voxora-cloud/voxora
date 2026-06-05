import logger from "@shared/core/logger";

export interface FaqFastPathMatch {
  answer: string;
  score: number;
}

function parseFaqFastPathMatch(data: unknown): FaqFastPathMatch | null {
  if (!data || typeof data !== "object") return null;

  const payload = data as Record<string, unknown>;
  if (payload.status !== "ok" || payload.match !== true) return null;
  if (typeof payload.answer !== "string" || typeof payload.score !== "number") {
    return null;
  }

  return {
    answer: payload.answer,
    score: payload.score,
  };
}

const AI_TOOL_SECRET = process.env.AI_TOOL_SECRET?.trim();

if (process.env.NODE_ENV === "production" && !AI_TOOL_SECRET) {
  throw new Error("AI_TOOL_SECRET is required in production");
}

function getAiServiceUrl(): string {
  return (process.env.AI_SERVICE_URL || "http://localhost:4010").replace(
    /\/+$/,
    "",
  );
}

export async function lookupFaqFastPathAnswer(params: {
  organizationId: string;
  message: string;
}): Promise<FaqFastPathMatch | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1_500);

  try {
    const response = await fetch(
      `${getAiServiceUrl()}/internal/faq-fast-path`,
      {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          ...(AI_TOOL_SECRET ? { "x-ai-tool-secret": AI_TOOL_SECRET } : {}),
        },
        body: JSON.stringify({
          organizationId: params.organizationId,
          message: params.message,
        }),
      },
    );

    if (!response.ok) {
      logger.warn("FAQ fast-path lookup returned non-OK response", {
        organizationId: params.organizationId,
        statusCode: response.status,
      });
      return null;
    }

    return parseFaqFastPathMatch(await response.json());
  } catch (error) {
    logger.warn("FAQ fast-path lookup failed", {
      organizationId: params.organizationId,
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
