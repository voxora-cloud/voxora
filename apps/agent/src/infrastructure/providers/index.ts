// \u2500\u2500 Public API for the providers module \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

// Types
export type {
  ProviderType,
  ModelCapabilities,
  LLMMessage,
  LLMOptions,
  LLMTokenUsage,
  LLMGenerateStep,
  LLMGenerateResult,
  AICallEvent,
} from "./types/ai.types";

// Base interfaces
export type { LLMProvider } from "./base/llm.provider";
export type { EmbeddingProvider } from "./base/embedding.provider";

// Registry helpers
export {
  LLM_REGISTRY,
  EMBEDDING_REGISTRY,
  getLLMModelConfig,
  getEmbeddingModelConfig,
} from "./registry/model.registry";

// Factory — the primary entry point for consumers
export { ProviderFactory } from "./factory/provider.factory";

// Routing
export { ModelRouter } from "./routing/model-router";
export { FallbackRouter } from "./routing/fallback-router";
export type { ModelSelectCriteria } from "./routing/model-router";
export type { FallbackChainEntry } from "./routing/fallback-router";
export { modelHealth, ModelFailureType, classifyError } from "./routing/model-health";

// Observability
export { trackAICall, AI_OBSERVABILITY_QUEUE } from "./observability/observability.queue";
export { estimateCost } from "./observability/cost-tracker";
export { LatencyTracker } from "./observability/latency-tracker";
export { TokenTracker } from "./observability/token-tracker";
