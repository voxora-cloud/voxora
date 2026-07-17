import { ProviderType } from "../types/ai.types";

// ── LLM Model Registry ────────────────────────────────────────────────────────
// This is the ONLY place where LLM model capabilities are defined.
// Never use model.includes("claude") or similar magic strings.
export interface LLMModelConfig {
  provider: ProviderType;
  contextWindow: number;
  supportsTools: boolean;
  supportsVision: boolean;
  supportsReasoning: boolean;
  supportsStreaming: boolean;
  /**
   * Fallback priority — lower number = tried earlier in the fallback chain.
   * The primary model (from BEDROCK_MODEL env) is always first regardless.
   * Models without a priority default to 99 (tried last).
   *
   * InteraOne fallback order: Nova Pro (primary) → Kimi(1) → Claude(2) → GPT(3)
   */
  fallbackPriority?: number;
}
export const LLM_REGISTRY: Record<string, LLMModelConfig> = {
  // ── Hugging Face LLM Models (5 best models, >100B params when possible) ───────
  "meta-llama/Llama-3.3-70B-Instruct": {
    provider: "huggingface",
    contextWindow: 128_000,
    supportsTools: true,
    supportsVision: false,
    supportsReasoning: false,
    supportsStreaming: true,
    fallbackPriority: 1,
  },
  "meta-llama/Llama-3.1-405B-Instruct": {
    provider: "huggingface",
    contextWindow: 128_000,
    supportsTools: true,
    supportsVision: false,
    supportsReasoning: false,
    supportsStreaming: true,
    fallbackPriority: 2,
  },
  "deepseek-ai/DeepSeek-R1": {
    provider: "huggingface",
    contextWindow: 128_000,
    supportsTools: true,
    supportsVision: false,
    supportsReasoning: true,
    supportsStreaming: true,
    fallbackPriority: 3,
  },
  "deepseek-ai/DeepSeek-V3": {
    provider: "huggingface",
    contextWindow: 128_000,
    supportsTools: true,
    supportsVision: false,
    supportsReasoning: false,
    supportsStreaming: true,
    fallbackPriority: 4,
  },
  "mistralai/Mixtral-8x22B-Instruct-v0.1": {
    provider: "huggingface",
    contextWindow: 64_000,
    supportsTools: true,
    supportsVision: false,
    supportsReasoning: false,
    supportsStreaming: true,
    fallbackPriority: 5,
  },
};


// ── Embedding Model Registry ──────────────────────────────────────────────────
// Defines dimensions and flags — no string-based checks ever needed.
export interface EmbeddingModelConfig {
  provider: ProviderType;
  dimensions: number;
  /** If false, the dimensions field is fixed and cannot be customised in the API request */
  supportsCustomDimensions: boolean;
  /** Bedrock pricing per 1k tokens — used for cost estimation */
  costPer1kTokens?: number;
}

export const EMBEDDING_REGISTRY: Record<string, EmbeddingModelConfig> = {
  // ── Hugging Face Embedding Models (3 best models) ─────────────────────────────
  "sentence-transformers/all-MiniLM-L6-v2": {
    provider: "huggingface",
    dimensions: 384,
    supportsCustomDimensions: false,
    costPer1kTokens: 0,
  },
  "BAAI/bge-large-en-v1.5": {
    provider: "huggingface",
    dimensions: 1024,
    supportsCustomDimensions: false,
    costPer1kTokens: 0,
  },
  "intfloat/e5-mistral-7b-instruct": {
    provider: "huggingface",
    dimensions: 4096,
    supportsCustomDimensions: false,
    costPer1kTokens: 0,
  },
};

/** Look up an LLM model config, falling back to a sensible default if unknown */
export function getLLMModelConfig(modelId: string): LLMModelConfig {
  return (
    LLM_REGISTRY[modelId] ?? {
      provider: "huggingface" as ProviderType,
      contextWindow: 128_000,
      supportsTools: true,
      supportsVision: false,
      supportsReasoning: false,
      supportsStreaming: true,
      fallbackPriority: 99,
    }
  );
}

/** Look up an embedding model config, returning undefined for unknown models */
export function getEmbeddingModelConfig(
  modelId: string,
): EmbeddingModelConfig | undefined {
  return EMBEDDING_REGISTRY[modelId];
}
