import { LLMProvider } from "../base/llm.provider";
import { EmbeddingProvider } from "../base/embedding.provider";
import { BedrockLLMProvider } from "../bedrock/bedrock-llm.provider";
import { BedrockEmbeddingProvider } from "../bedrock/bedrock-embedding.provider";
import { OllamaLLMProvider } from "../ollama/ollama-llm.provider";
import { OllamaEmbeddingProvider } from "../ollama/ollama-embedding.provider";
import { HuggingFaceLLMProvider } from "../huggingface/huggingface-llm.provider";
import { HuggingFaceEmbeddingProvider } from "../huggingface/huggingface-embedding.provider";
import { OpenAILLMProvider } from "../openai/openai-llm.provider";
import { OpenAIEmbeddingProvider } from "../openai/openai-embedding.provider";
import { ProviderType } from "../types/ai.types";

// Singletons — one client per process
let _llmProvider: LLMProvider | undefined;
let _embeddingProvider: EmbeddingProvider | undefined;

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
      _embeddingProvider = ProviderFactory.createEmbeddingProvider(active);
    }
    return _embeddingProvider;
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
