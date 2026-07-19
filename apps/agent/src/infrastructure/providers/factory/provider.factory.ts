import { LLMProvider } from "../base/llm.provider";
import { EmbeddingOptions, EmbeddingProvider } from "../base/embedding.provider";
import { BedrockLLMProvider } from "../bedrock/bedrock-llm.provider";
import { BedrockEmbeddingProvider } from "../bedrock/bedrock-embedding.provider";
import { OllamaLLMProvider } from "../ollama/ollama-llm.provider";
import { OllamaEmbeddingProvider } from "../ollama/ollama-embedding.provider";
import { HuggingFaceLLMProvider } from "../huggingface/huggingface-llm.provider";
import { HuggingFaceEmbeddingProvider } from "../huggingface/huggingface-embedding.provider";
import { OpenAILLMProvider } from "../openai/openai-llm.provider";
import { OpenAIEmbeddingProvider } from "../openai/openai-embedding.provider";
import { ModelCapabilities, ProviderType } from "../types/ai.types";
import { EmbeddingFallbackRouter } from "../routing/embedding-fallback-router";
import config from "../../../config";

// Singletons — one client per process
let _llmProvider: LLMProvider | undefined;
let _embeddingProvider: EmbeddingProvider | undefined;

class ResilientEmbeddingProvider implements EmbeddingProvider {
  constructor(
    private readonly provider: EmbeddingProvider,
    private readonly primaryModel: string,
  ) {}

  get name(): string {
    return this.provider.name;
  }

  get dimensions(): number {
    return this.provider.dimensions;
  }

  set dimensions(val: number) {
    this.provider.dimensions = val;
  }

  async embed(text: string, options?: EmbeddingOptions): Promise<number[]> {
    return EmbeddingFallbackRouter.embed(this.provider, this.primaryModel, text, options);
  }

  async getCapabilities(): Promise<ModelCapabilities> {
    return this.provider.getCapabilities();
  }

  async getModelInfo(modelId?: string): Promise<{ dimensions: number }> {
    return this.provider.getModelInfo(modelId);
  }
}

/**
 * Central factory for all AI providers.
 *
 * Supported: bedrock, ollama, huggingface, openai
 */
export class ProviderFactory {
  /**
   * Returns the active LLM provider.
   * @param provider Override via argument or LLM_PROVIDER env var.
   *                 Defaults to "bedrock".
   */
  static getLLMProvider(provider?: string): LLMProvider {
    const active = (
      provider ?? process.env.LLM_PROVIDER ?? "bedrock"
    ) as ProviderType;

    if (!_llmProvider || _llmProvider.name !== active) {
      _llmProvider = ProviderFactory.createLLMProvider(active);
    }
    return _llmProvider;
  }

  /**
   * Returns the active embedding provider.
   * @param provider Override via argument or EMBEDDING_PROVIDER env var.
   *                 Defaults to "bedrock".
   */
  static getEmbeddingProvider(provider?: string): EmbeddingProvider {
    const active = (
      provider ?? process.env.EMBEDDING_PROVIDER ?? "bedrock"
    ) as ProviderType;

    if (!_embeddingProvider || _embeddingProvider.name !== active) {
      const rawProvider = ProviderFactory.createEmbeddingProvider(active);
      const primaryModel = ProviderFactory.getPrimaryModel(active);
      _embeddingProvider = new ResilientEmbeddingProvider(rawProvider, primaryModel);
    }
    return _embeddingProvider;
  }

  private static getPrimaryModel(type: ProviderType): string {
    switch (type) {
      case "bedrock":
        return config.embeddings.bedrock?.model || "amazon.titan-embed-text-v2:0";
      case "openai":
        return config.embeddings.openai?.model || "text-embedding-3-small";
      case "ollama":
        return config.embeddings.ollama?.model || "nomic-embed-text";
      case "huggingface":
        return config.embeddings.huggingface?.model || "sentence-transformers/all-MiniLM-L6-v2";
      default:
        return "";
    }
  }

  private static createLLMProvider(type: ProviderType): LLMProvider {
    switch (type) {
      case "bedrock":
        return new BedrockLLMProvider();
      case "ollama":
        return new OllamaLLMProvider();
      case "huggingface":
        return new HuggingFaceLLMProvider();
      case "openai":
        return new OpenAILLMProvider();
      default:
        throw new Error(
          `[ProviderFactory] Unknown LLM provider: "${type}". ` +
            `Supported: bedrock, ollama, huggingface, openai`,
        );
    }
  }

  private static createEmbeddingProvider(
    type: ProviderType,
  ): EmbeddingProvider {
    switch (type) {
      case "bedrock":
        return new BedrockEmbeddingProvider();
      case "ollama":
        return new OllamaEmbeddingProvider();
      case "huggingface":
        return new HuggingFaceEmbeddingProvider();
      case "openai":
        return new OpenAIEmbeddingProvider();
      default:
        throw new Error(
          `[ProviderFactory] Unknown embedding provider: "${type}". ` +
            `Supported: bedrock, ollama, huggingface, openai`,
        );
    }
  }
}
