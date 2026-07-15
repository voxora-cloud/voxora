import { ProviderFactory } from "../factory/provider.factory";
import {
  LLMGenerateResult,
  LLMMessage,
  LLMOptions,
} from "../types/ai.types";
import { getLLMModelConfig, LLM_REGISTRY } from "../registry/model.registry";
import config from "../../../config";
import logger from "../../../shared/logger";
import { modelHealth, ModelFailureType } from "./model-health";

export interface FallbackChainEntry {
  /** Provider name — e.g. "bedrock" */
  provider: string;
  /** Specific model to use for this entry. If omitted, the provider default is used. */
  model?: string;
}

const ACTIVE_PROVIDER = (process.env.LLM_PROVIDER ?? "bedrock") as "bedrock" | "ollama" | "huggingface" | "openai";

const DEFAULT_MODEL = ACTIVE_PROVIDER === "ollama"
  ? (config.llm.ollama?.model ?? "llama3.2")
  : ACTIVE_PROVIDER === "huggingface"
  ? (config.llm.huggingface?.model ?? "meta-llama/Llama-3.3-70B-Instruct")
  : ACTIVE_PROVIDER === "openai"
  ? (config.llm.openai?.model ?? "gpt-4o-mini")
  : (config.llm.bedrock?.model ?? "us.amazon.nova-pro-v1:0");

/**
 * Builds the fallback chain dynamically from the model registry.
 *
 * 1. The primary model (from BEDROCK_MODEL env) is always first.
 * 2. All other registered models from the same provider are appended,
 *    sorted by `fallbackPriority` (kimi → nova → sonnet → gpt).
 * 3. Only models with at least the primary's tool & vision capabilities
 *    are included — so a request built with tools never routes to a
 *    model that can't handle them.
 * 4. Models currently marked dead by the circuit breaker are skipped.
 */
function buildFallbackChain(): FallbackChainEntry[] {
  const primaryConfig = getLLMModelConfig(DEFAULT_MODEL);

  const candidates: { modelId: string; priority: number }[] = [];

  for (const [modelId, modelCfg] of Object.entries(LLM_REGISTRY)) {
    if (modelId === DEFAULT_MODEL) continue;
    if (modelCfg.provider !== primaryConfig.provider) continue;

    // Fallback must support at least the primary's tool & vision capabilities
    if (primaryConfig.supportsTools && !modelCfg.supportsTools) continue;
    if (primaryConfig.supportsVision && !modelCfg.supportsVision) continue;

    candidates.push({
      modelId,
      priority: modelCfg.fallbackPriority ?? 99,
    });
  }

  // Sort by priority (lower = tried earlier)
  candidates.sort((a, b) => a.priority - b.priority);

  const chain: FallbackChainEntry[] = [
    { provider: primaryConfig.provider, model: DEFAULT_MODEL },
    ...candidates.map((c) => ({ provider: primaryConfig.provider, model: c.modelId })),
  ];

  logger.info("[FallbackRouter] Fallback chain built", {
    primary: DEFAULT_MODEL,
    chain: chain.map((e) => e.model ?? e.provider),
    deadModels: modelHealth.getDeadModels(),
  });

  return chain;
}

/**
 * Wraps LLM generation with an ordered fallback chain + circuit breaker.
 *
 * - Models marked dead by the circuit breaker are skipped instantly.
 * - On failure, the error is classified. Deprecated/throttled/auth models
 *   are marked dead for a cool-down period so future requests skip them
 *   without wasting a round-trip.
 * - On success, the model's health record is cleared.
 * - The final error is re-thrown only when every healthy model has failed.
 */
export class FallbackRouter {
  private static readonly chain: FallbackChainEntry[] = buildFallbackChain();

  static async generate(
    messages: LLMMessage[],
    options: LLMOptions = {},
  ): Promise<LLMGenerateResult> {
    let lastError: Error | undefined;
    let attemptNumber = 0;

    for (let i = 0; i < FallbackRouter.chain.length; i++) {
      const entry = FallbackRouter.chain[i];
      const modelId = entry.model ?? "(provider-default)";

      // ── Circuit breaker: skip dead models instantly ──────────────────────
      if (!modelHealth.isHealthy(modelId)) {
        logger.debug("[FallbackRouter] Skipping dead model", { modelId });
        continue;
      }

      attemptNumber += 1;
      const isFallback = i > 0;

      try {
        const provider = ProviderFactory.getLLMProvider(entry.provider);

        const opts: LLMOptions = entry.model
          ? { ...options, model: entry.model }
          : options;

        if (isFallback) {
          logger.warn("[FallbackRouter] Trying fallback model", {
            attempt: attemptNumber,
            provider: entry.provider,
            model: entry.model,
            previousError: lastError?.message,
          });
        }

        const result = await provider.generate(messages, opts);

        // ── Success — clear any prior failure record ────────────────────────
        modelHealth.markHealthy(modelId);

        return result;
      } catch (err: unknown) {
        lastError = err instanceof Error ? err : new Error(String(err));
        const errorMsg = lastError.message;

        // ── Classify the error and update circuit breaker ───────────────────
        const failureType = modelHealth.markFailed(modelId, errorMsg);

        const remainingHealthy = FallbackRouter.chain
          .slice(i + 1)
          .filter((e) => modelHealth.isHealthy(e.model ?? "(provider-default)"))
          .length;

        logger.error("[FallbackRouter] Model failed", {
          attempt: attemptNumber,
          provider: entry.provider,
          model: entry.model,
          failureType,
          error: errorMsg,
          healthyModelsLeft: remainingHealthy,
        });

        if (failureType === ModelFailureType.MODEL_DEPRECATED) {
          logger.warn("[FallbackRouter] Model deprecated — circuit open for 24h", {
            modelId: entry.model,
          });
        }
      }
    }

    throw lastError ?? new Error("[FallbackRouter] All models failed or dead");
  }
}
