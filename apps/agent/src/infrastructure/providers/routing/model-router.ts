import { getLLMModelConfig, LLM_REGISTRY } from "../registry/model.registry";
import config from "../../../config";

export interface ModelSelectCriteria {
  /** If true, the returned model must support tool use */
  supportsTools?: boolean;
  /** If true, the returned model must support vision */
  supportsVision?: boolean;
  /** If true, the returned model must support extended reasoning */
  supportsReasoning?: boolean;
  /** If set, the returned model must have at least this context window */
  minContextWindow?: number;
}

/**
 * Selects a Bedrock model ID from the registry based on capability requirements.
 *
 * In v1 there are no tenant-tier restrictions — this simply finds the best
 * match from the LLM_REGISTRY. The configured default model is always tried
 * first; if it doesn't satisfy the criteria a search is performed.
 */
export class ModelRouter {
  private static get defaultModelId(): string {
    return (
      config.llm.bedrock?.model ??
      "us.amazon.nova-pro-v1:0"
    );
  }

  /**
   * Returns a model ID that satisfies all the given criteria.
   * Falls back to the configured default if no explicit criteria are given.
   *
   * @throws {Error} if no registered model satisfies the criteria
   */
  static select(criteria: ModelSelectCriteria = {}): string {
    const defaultId = ModelRouter.defaultModelId;

    // Fast path — no filters → return default
    if (Object.keys(criteria).length === 0) {
      return defaultId;
    }

    // Try default first
    if (ModelRouter.satisfies(defaultId, criteria)) {
      return defaultId;
    }

    // Search registry for a satisfying model
    for (const [modelId] of Object.entries(LLM_REGISTRY)) {
      if (ModelRouter.satisfies(modelId, criteria)) {
        return modelId;
      }
    }

    throw new Error(
      `[ModelRouter] No model in the registry satisfies criteria: ${JSON.stringify(criteria)}`,
    );
  }

  private static satisfies(
    modelId: string,
    criteria: ModelSelectCriteria,
  ): boolean {
    const cfg = getLLMModelConfig(modelId);
    if (criteria.supportsTools && !cfg.supportsTools) return false;
    if (criteria.supportsVision && !cfg.supportsVision) return false;
    if (criteria.supportsReasoning && !cfg.supportsReasoning) return false;
    if (
      criteria.minContextWindow !== undefined &&
      cfg.contextWindow < criteria.minContextWindow
    )
      return false;
    return true;
  }
}
