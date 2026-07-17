import { EMBEDDING_REGISTRY, getEmbeddingModelConfig } from "../registry/model.registry";
import { EmbeddingProvider, EmbeddingOptions } from "../base/embedding.provider";
import { modelHealth } from "./model-health";
import logger from "../../../shared/logger";

export class EmbeddingFallbackRouter {
  /**
   * Builds the fallback chain dynamically for the current model.
   * Only models of the SAME provider with the SAME dimensions are candidates.
   */
  static buildChain(providerName: string, primaryModel: string): string[] {
    const primaryConfig = getEmbeddingModelConfig(primaryModel);
    if (!primaryConfig) {
      return [primaryModel];
    }

    const primaryDimensions = primaryConfig.dimensions;
    const candidates: string[] = [];

    for (const [modelId, modelCfg] of Object.entries(EMBEDDING_REGISTRY)) {
      if (modelId === primaryModel) continue;
      if (modelCfg.provider !== providerName) continue;
      if (modelCfg.dimensions !== primaryDimensions) continue;

      candidates.push(modelId);
    }

    return [primaryModel, ...candidates];
  }

  static async embed(
    provider: EmbeddingProvider,
    primaryModel: string,
    text: string,
    options?: EmbeddingOptions,
  ): Promise<number[]> {
    const chain = EmbeddingFallbackRouter.buildChain(provider.name, primaryModel);
    let lastError: Error | undefined;

    for (let i = 0; i < chain.length; i++) {
      const modelId = chain[i];

      // Circuit breaker: skip dead models instantly
      if (!modelHealth.isHealthy(modelId)) {
        logger.debug("[EmbeddingFallbackRouter] Skipping dead model", { modelId });
        continue;
      }

      const isFallback = i > 0;
      if (isFallback) {
        logger.warn("[EmbeddingFallbackRouter] Trying fallback embedding model", {
          attempt: i + 1,
          provider: provider.name,
          model: modelId,
          previousError: lastError?.message,
        });
      }

      try {
        const result = await provider.embed(text, {
          ...options,
          modelId,
        });

        // Success - mark model healthy
        modelHealth.markHealthy(modelId);
        return result;
      } catch (err: unknown) {
        lastError = err instanceof Error ? err : new Error(String(err));
        const errorMsg = lastError.message;

        // Classify the error and update circuit breaker
        modelHealth.markFailed(modelId, errorMsg);

        logger.error("[EmbeddingFallbackRouter] Model failed", {
          attempt: i + 1,
          provider: provider.name,
          model: modelId,
          error: errorMsg,
        });
      }
    }

    throw lastError ?? new Error("[EmbeddingFallbackRouter] All embedding models failed or dead");
  }
}
