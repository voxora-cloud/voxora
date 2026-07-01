import { ProviderType } from "../types/ai.types";

// ── Bedrock pricing constants (USD per 1 million tokens) ──────────────────────
// Source: https://aws.amazon.com/bedrock/pricing/
const BEDROCK_INPUT_COST_PER_M: Record<string, number> = {
  "us.anthropic.claude-3-5-sonnet-20241022-v2:0": 3.0,
  "us.anthropic.claude-3-5-haiku-20241022-v1:0": 0.8,
  "us.anthropic.claude-3-7-sonnet-20250219-v1:0": 3.0,
  "us.meta.llama3-1-8b-instruct-v1:0": 0.22,
  "us.meta.llama3-1-70b-instruct-v1:0": 0.72,
  "us.meta.llama3-3-70b-instruct-v1:0": 0.72,
  // Embedding models
  "amazon.titan-embed-text-v1": 0.1,
  "amazon.titan-embed-text-v2:0": 0.02,
};

const BEDROCK_OUTPUT_COST_PER_M: Record<string, number> = {
  "us.anthropic.claude-3-5-sonnet-20241022-v2:0": 15.0,
  "us.anthropic.claude-3-5-haiku-20241022-v1:0": 4.0,
  "us.anthropic.claude-3-7-sonnet-20250219-v1:0": 15.0,
  "us.meta.llama3-1-8b-instruct-v1:0": 0.22,
  "us.meta.llama3-1-70b-instruct-v1:0": 0.72,
  "us.meta.llama3-3-70b-instruct-v1:0": 0.72,
};

// ── OpenAI pricing constants (USD per 1 million tokens) ────────────────────────
const OPENAI_INPUT_COST_PER_M: Record<string, number> = {
  "gpt-4o": 2.50,
  "gpt-4o-mini": 0.15,
  "o1-mini": 3.00,
  // Embedding models
  "text-embedding-3-small": 0.02,
  "text-embedding-3-large": 0.13,
  "text-embedding-ada-002": 0.10,
};

const OPENAI_OUTPUT_COST_PER_M: Record<string, number> = {
  "gpt-4o": 10.00,
  "gpt-4o-mini": 0.60,
  "o1-mini": 12.00,
};

/**
 * Estimates the USD cost of a single LLM or embedding API call.
 * Returns undefined when pricing data is not available for the model.
 */
export function estimateCost(
  provider: ProviderType,
  modelId: string,
  inputTokens: number,
  outputTokens: number,
): number | undefined {
  if (provider === "bedrock") {
    const inputRate = BEDROCK_INPUT_COST_PER_M[modelId];
    const outputRate = BEDROCK_OUTPUT_COST_PER_M[modelId] ?? 0;

    if (inputRate === undefined) return undefined;

    const cost =
      (inputTokens / 1_000_000) * inputRate +
      (outputTokens / 1_000_000) * outputRate;

    return Math.round(cost * 1_000_000) / 1_000_000;
  }

  if (provider === "openai") {
    const inputRate = OPENAI_INPUT_COST_PER_M[modelId];
    const outputRate = OPENAI_OUTPUT_COST_PER_M[modelId] ?? 0;

    if (inputRate === undefined) return undefined;

    const cost =
      (inputTokens / 1_000_000) * inputRate +
      (outputTokens / 1_000_000) * outputRate;

    return Math.round(cost * 1_000_000) / 1_000_000;
  }

  return undefined;
}
