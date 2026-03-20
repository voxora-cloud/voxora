import { EmbeddingProvider } from "./types";
import { GeminiEmbeddingProvider } from "./gemini.embedding";

const providers = new Map<string, EmbeddingProvider>();

export function registerEmbeddingProvider(provider: EmbeddingProvider): void {
  providers.set(provider.name, provider);
  console.log(
    `[Embeddings] Registered provider: ${provider.name} (${provider.dimensions}d)`,
  );
}

export function getEmbeddingProvider(name?: string): EmbeddingProvider {
  const key = name ?? process.env.EMBEDDING_PROVIDER ?? "gemini";
  const provider = providers.get(key);
  if (!provider) {
    throw new Error(
      `Embedding provider "${key}" not registered. Available: [${[...providers.keys()].join(", ")}]`,
    );
  }
  return provider;
}

registerEmbeddingProvider(new GeminiEmbeddingProvider());

export type { EmbeddingProvider } from "./types";
