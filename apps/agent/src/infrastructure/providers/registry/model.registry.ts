import { ProviderType } from "../types/ai.types";
import config from "../../../config";

// ── LLM Model Registry ────────────────────────────────────────────────────────
export interface LLMModelConfig {
  provider: ProviderType;
  contextWindow: number;
  supportsTools: boolean;
  supportsVision: boolean;
  supportsReasoning: boolean;
  supportsStreaming: boolean;
  fallbackPriority?: number;
}

export const LLM_REGISTRY: Record<string, LLMModelConfig> = {
  // ── Hugging Face Models ─────────────────────────────────────────────────────
  "meta-llama/Llama-4-Maverick-17B-128E-Instruct": {
    provider: "huggingface",
    contextWindow: 1_000_000,
    supportsTools: true,
    supportsVision: true,
    supportsReasoning: false,
    supportsStreaming: true,
    fallbackPriority: 1,
  },
  "meta-llama/Llama-4-Scout-17B-16E-Instruct": {
    provider: "huggingface",
    contextWindow: 10_000_000,
    supportsTools: true,
    supportsVision: true,
    supportsReasoning: false,
    supportsStreaming: true,
    fallbackPriority: 2,
  },
  "deepseek-ai/DeepSeek-V4-Flash": {
    provider: "huggingface",
    contextWindow: 1_000_000,
    supportsTools: true,
    supportsVision: false,
    supportsReasoning: true,
    supportsStreaming: true,
    fallbackPriority: 3,
  },
  "deepseek-ai/DeepSeek-V4-Pro": {
    provider: "huggingface",
    contextWindow: 1_000_000,
    supportsTools: true,
    supportsVision: false,
    supportsReasoning: true,
    supportsStreaming: true,
    fallbackPriority: 4,
  },
  "mistralai/Mistral-Large-3-2512": {
    provider: "huggingface",
    contextWindow: 256_000,
    supportsTools: true,
    supportsVision: false,
    supportsReasoning: false,
    supportsStreaming: true,
    fallbackPriority: 5,
  },
  "meta-llama/Llama-3.3-70B-Instruct": {
    provider: "huggingface",
    contextWindow: 128_000,
    supportsTools: true,
    supportsVision: false,
    supportsReasoning: false,
    supportsStreaming: true,
    fallbackPriority: 6,
  },
  "deepseek-ai/DeepSeek-R1": {
    provider: "huggingface",
    contextWindow: 128_000,
    supportsTools: true,
    supportsVision: false,
    supportsReasoning: true,
    supportsStreaming: true,
    fallbackPriority: 7,
  },

  // ── AWS Bedrock Models ──────────────────────────────────────────────────────
  "anthropic.claude-opus-4-8": {
    provider: "bedrock",
    contextWindow: 1_000_000,
    supportsTools: true,
    supportsVision: true,
    supportsReasoning: true,
    supportsStreaming: true,
    fallbackPriority: 1,
  },
  "us.anthropic.claude-sonnet-4-6": {
    provider: "bedrock",
    contextWindow: 1_000_000,
    supportsTools: true,
    supportsVision: true,
    supportsReasoning: true,
    supportsStreaming: true,
    fallbackPriority: 2,
  },
  "us.anthropic.claude-haiku-4-5-20251001-v1:0": {
    provider: "bedrock",
    contextWindow: 200_000,
    supportsTools: true,
    supportsVision: false,
    supportsReasoning: false,
    supportsStreaming: true,
    fallbackPriority: 3,
  },
  "amazon.nova-2-lite-v1:0": {
    provider: "bedrock",
    contextWindow: 1_000_000,
    supportsTools: true,
    supportsVision: true,
    supportsReasoning: true,
    supportsStreaming: true,
    fallbackPriority: 4,
  },
  "amazon.nova-2-pro-v1:0": {
    provider: "bedrock",
    contextWindow: 1_000_000,
    supportsTools: true,
    supportsVision: true,
    supportsReasoning: true,
    supportsStreaming: true,
    fallbackPriority: 5,
  },
  "amazon.nova-pro-v1:0": {
    provider: "bedrock",
    contextWindow: 300_000,
    supportsTools: true,
    supportsVision: true,
    supportsReasoning: false,
    supportsStreaming: true,
    fallbackPriority: 6,
  },
  "anthropic.claude-3-5-sonnet-20241022-v2:0": {
    provider: "bedrock",
    contextWindow: 200_000,
    supportsTools: true,
    supportsVision: true,
    supportsReasoning: false,
    supportsStreaming: true,
    fallbackPriority: 7,
  },
  "meta.llama4-maverick-17b-instruct-v1:0": {
    provider: "bedrock",
    contextWindow: 1_000_000,
    supportsTools: true,
    supportsVision: true,
    supportsReasoning: false,
    supportsStreaming: true,
    fallbackPriority: 8,
  },

  // ── OpenAI Models ───────────────────────────────────────────────────────────
  "gpt-5.5": {
    provider: "openai",
    contextWindow: 400_000,
    supportsTools: true,
    supportsVision: true,
    supportsReasoning: true,
    supportsStreaming: true,
    fallbackPriority: 1,
  },
  "o3-mini": {
    provider: "openai",
    contextWindow: 200_000,
    supportsTools: true,
    supportsVision: false,
    supportsReasoning: true,
    supportsStreaming: true,
    fallbackPriority: 3,
  },
  "gpt-4o": {
    provider: "openai",
    contextWindow: 128_000,
    supportsTools: true,
    supportsVision: true,
    supportsReasoning: false,
    supportsStreaming: true,
    fallbackPriority: 2,
  },

  // ── Ollama Models ───────────────────────────────────────────────────────────
  "llama4:scout": {
    provider: "ollama",
    contextWindow: 10_000_000,
    supportsTools: true,
    supportsVision: true,
    supportsReasoning: false,
    supportsStreaming: true,
    fallbackPriority: 1,
  },
  "llama4:maverick": {
    provider: "ollama",
    contextWindow: 1_000_000,
    supportsTools: true,
    supportsVision: true,
    supportsReasoning: false,
    supportsStreaming: true,
    fallbackPriority: 2,
  },
  "mistral-large3": {
    provider: "ollama",
    contextWindow: 256_000,
    supportsTools: true,
    supportsVision: false,
    supportsReasoning: false,
    supportsStreaming: true,
    fallbackPriority: 3,
  },
  "deepseek-r1:70b": {
    provider: "ollama",
    contextWindow: 128_000,
    supportsTools: true,
    supportsVision: false,
    supportsReasoning: true,
    supportsStreaming: true,
    fallbackPriority: 4,
  },
  "llama3.3": {
    provider: "ollama",
    contextWindow: 128_000,
    supportsTools: true,
    supportsVision: false,
    supportsReasoning: false,
    supportsStreaming: true,
    fallbackPriority: 5,
  },
  "qwen2.5:72b": {
    provider: "ollama",
    contextWindow: 128_000,
    supportsTools: true,
    supportsVision: false,
    supportsReasoning: false,
    supportsStreaming: true,
    fallbackPriority: 6,
  },
};

// ── Embedding Model Registry ──────────────────────────────────────────────────
export interface EmbeddingModelConfig {
  provider: ProviderType;
  dimensions: number;
  supportsCustomDimensions: boolean;
  costPer1kTokens?: number;
}

export const EMBEDDING_REGISTRY: Record<string, EmbeddingModelConfig> = {
  // Hugging Face Embeddings
  "BAAI/bge-large-en-v1.5": {
    provider: "huggingface",
    dimensions: 1024,
    supportsCustomDimensions: false,
  },

  // Bedrock Embeddings
  "amazon.titan-embed-text-v2:0": {
    provider: "bedrock",
    dimensions: 1024,
    supportsCustomDimensions: true,
  },

  // OpenAI Embeddings
  "text-embedding-3-small": {
    provider: "openai",
    dimensions: 1024,
    supportsCustomDimensions: true,
  },
  "text-embedding-3-large": {
    provider: "openai",
    dimensions: 1024,
    supportsCustomDimensions: true,
  },

  // Ollama Embeddings
  "mxbai-embed-large": {
    provider: "ollama",
    dimensions: 1024,
    supportsCustomDimensions: false,
  },
};

export function hasProviderCredentials(provider: ProviderType): boolean {
  switch (provider) {
    case "huggingface":
      return !!config.llm.huggingface?.token;
    case "openai":
      return !!config.llm.openai?.apiKey;
    case "bedrock":
      return !!(config.llm.bedrock?.accessKeyId && config.llm.bedrock?.secretAccessKey);
    case "ollama":
      return true; // Ollama is local, doesn't require credentials
    default:
      return false;
  }
}

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
