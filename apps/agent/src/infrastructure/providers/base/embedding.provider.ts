import { ModelCapabilities } from "../types/ai.types";

export interface EmbeddingOptions {
  organizationId?: string;
  conversationId?: string;
  modelId?: string;
}

export interface EmbeddingProvider {
  /** Unique name of this provider, e.g. "bedrock" */
  readonly name: string;
  /** Current effective embedding dimension size */
  dimensions: number;
  embed(
    text: string,
    options?: EmbeddingOptions,
  ): Promise<number[]>;
  getCapabilities(): Promise<ModelCapabilities>;
  /** Ask the provider for the true dimension count of the active model.
   *  Consults the registry first, then falls back to a live API probe. */
  getModelInfo(modelId?: string): Promise<{ dimensions: number }>;
}
