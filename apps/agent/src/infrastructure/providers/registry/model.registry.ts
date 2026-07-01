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
  // ── OpenAI GPT via Bedrock (priority 3) ────────────────────────────────────
  "openai.gpt-oss-120b-1:0": {
    provider: "bedrock",
    contextWindow: 128_000,
    supportsTools: true,
    supportsVision: true,
    supportsReasoning: false,
    supportsStreaming: true,
    fallbackPriority: 3,
  },

  // ── Anthropic Claude via Bedrock (priority 2) ─────────────────────────────
  "anthropic.claude-sonnet-4-5-20250929-v1:0": {
    provider: "bedrock",
    contextWindow: 200_000,
    supportsTools: true,
    supportsVision: true,
    supportsReasoning: false,
    supportsStreaming: true,
    fallbackPriority: 2,
  },
  "anthropic.claude-haiku-4-5-20251001-v1:0": {
    provider: "bedrock",
    contextWindow: 200_000,
    supportsTools: true,
    supportsVision: true,
    supportsReasoning: false,
    supportsStreaming: true,
    fallbackPriority: 2,
  },
  "anthropic.claude-sonnet-4-6": {
    provider: "bedrock",
    contextWindow: 200_000,
    supportsTools: true,
    supportsVision: true,
    supportsReasoning: true,
    supportsStreaming: true,
    fallbackPriority: 2,
  },


  // ── Amazon Nova via Bedrock (priority 4 — same family as primary, last resort) ──
  "us.amazon.nova-pro-v1:0": {
    provider: "bedrock",
    contextWindow: 300_000,
    supportsTools: true,
    supportsVision: true,
    supportsReasoning: false,
    supportsStreaming: true,
    fallbackPriority: 4,
  },
  "us.amazon.nova-lite-v1:0": {
    provider: "bedrock",
    contextWindow: 300_000,
    supportsTools: true,
    supportsVision: true,
    supportsReasoning: false,
    supportsStreaming: true,
    fallbackPriority: 4,
  },
  "us.amazon.nova-micro-v1:0": {
    provider: "bedrock",
    contextWindow: 128_000,
    supportsTools: false,
    supportsVision: false,
    supportsReasoning: false,
    supportsStreaming: true,
    fallbackPriority: 4,
  },

  // ── Moonshot Kimi via Bedrock (priority 1 — first fallback) ────────────────
  "moonshotai.kimi-k2.5": {
    provider: "bedrock",
    contextWindow: 200_000,
    supportsTools: true,
    supportsVision: false,
    supportsReasoning: false,
    supportsStreaming: true,
    fallbackPriority: 1,
  },

  // ── Ollama (local/self-hosted) ───────────────────────────────────────────
  "llama3.2": {
    provider: "ollama",
    contextWindow: 128_000,
    supportsTools: true,
    supportsVision: false,
    supportsReasoning: false,
    supportsStreaming: true,
  },
  "llama3.1": {
    provider: "ollama",
    contextWindow: 128_000,
    supportsTools: true,
    supportsVision: false,
    supportsReasoning: false,
    supportsStreaming: true,
  },
  "llama3.1:8b": {
    provider: "ollama",
    contextWindow: 128_000,
    supportsTools: true,
    supportsVision: false,
    supportsReasoning: false,
    supportsStreaming: true,
  },
  "llama3.1:70b": {
    provider: "ollama",
    contextWindow: 128_000,
    supportsTools: true,
    supportsVision: false,
    supportsReasoning: false,
    supportsStreaming: true,
  },
  "mistral": {
    provider: "ollama",
    contextWindow: 32_000,
    supportsTools: true,
    supportsVision: false,
    supportsReasoning: false,
    supportsStreaming: true,
  },
  "mixtral": {
    provider: "ollama",
    contextWindow: 32_000,
    supportsTools: true,
    supportsVision: false,
    supportsReasoning: false,
    supportsStreaming: true,
  },
  "qwen2.5": {
    provider: "ollama",
    contextWindow: 128_000,
    supportsTools: true,
    supportsVision: false,
    supportsReasoning: false,
    supportsStreaming: true,
  },
  "qwen2.5:32b": {
    provider: "ollama",
    contextWindow: 128_000,
    supportsTools: true,
    supportsVision: false,
    supportsReasoning: false,
    supportsStreaming: true,
  },
  "phi3": {
    provider: "ollama",
    contextWindow: 128_000,
    supportsTools: false,
    supportsVision: false,
    supportsReasoning: false,
    supportsStreaming: true,
  },
  "gemma2": {
    provider: "ollama",
    contextWindow: 8_000,
    supportsTools: false,
    supportsVision: false,
    supportsReasoning: false,
    supportsStreaming: true,
  },
  // ── Hugging Face ─────────────────────────────────────────────────────────
  "meta-llama/Llama-3.3-70B-Instruct": {
    provider: "huggingface",
    contextWindow: 128_000,
    supportsTools: true,
    supportsVision: false,
    supportsReasoning: false,
    supportsStreaming: true,
  },

  "deepseek-ai/DeepSeek-V4-Flash": {
    provider: "huggingface",
    contextWindow: 128_000,
    supportsTools: true,
    supportsVision: false,
    supportsReasoning: false,
    supportsStreaming: true,
  },

  // ── OpenAI ───────────────────────────────────────────────────────────────
  "gpt-4o": {
    provider: "openai",
    contextWindow: 128_000,
    supportsTools: true,
    supportsVision: true,
    supportsReasoning: false,
    supportsStreaming: true,
  },
  "gpt-4o-mini": {
    provider: "openai",
    contextWindow: 128_000,
    supportsTools: true,
    supportsVision: true,
    supportsReasoning: false,
    supportsStreaming: true,
  },
  "o1-mini": {
    provider: "openai",
    contextWindow: 128_000,
    supportsTools: true,
    supportsVision: false,
    supportsReasoning: true,
    supportsStreaming: true,
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
  "amazon.titan-embed-text-v1": {
    provider: "bedrock",
    dimensions: 1536,
    supportsCustomDimensions: false,
    costPer1kTokens: 0.0001,
  },
  "amazon.titan-embed-text-v2:0": {
    provider: "bedrock",
    dimensions: 1024,
    supportsCustomDimensions: true,
    costPer1kTokens: 0.00002,
  },
  "nomic-embed-text": {
    provider: "ollama",
    dimensions: 768,
    supportsCustomDimensions: false,
    costPer1kTokens: 0,
  },
  "mxbai-embed-large": {
    provider: "ollama",
    dimensions: 1024,
    supportsCustomDimensions: false,
    costPer1kTokens: 0,
  },
  "all-MiniLM-L6-v2": {
    provider: "ollama",
    dimensions: 384,
    supportsCustomDimensions: false,
    costPer1kTokens: 0,
  },
  "snowflake-arctic-embed": {
    provider: "ollama",
    dimensions: 1024,
    supportsCustomDimensions: false,
    costPer1kTokens: 0,
  },
  // ── Hugging Face ─────────────────────────────────────────────────────────
  "sentence-transformers/all-MiniLM-L6-v2": {
    provider: "huggingface",
    dimensions: 384,
    supportsCustomDimensions: false,
    costPer1kTokens: 0,
  },
  // ── OpenAI ───────────────────────────────────────────────────────────────
  "text-embedding-3-small": {
    provider: "openai",
    dimensions: 1536,
    supportsCustomDimensions: true,
    costPer1kTokens: 0.00002,
  },
  "text-embedding-3-large": {
    provider: "openai",
    dimensions: 3072,
    supportsCustomDimensions: true,
    costPer1kTokens: 0.00013,
  },
  "text-embedding-ada-002": {
    provider: "openai",
    dimensions: 1536,
    supportsCustomDimensions: false,
    costPer1kTokens: 0.0001,
  },
};

/** Look up an LLM model config, falling back to a sensible default if unknown */
export function getLLMModelConfig(modelId: string): LLMModelConfig {
  return (
    LLM_REGISTRY[modelId] ?? {
      provider: "bedrock" as ProviderType,
      contextWindow: 8_192,
      supportsTools: false,
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
