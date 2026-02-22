import { EmbeddingProvider } from "./types";
import { GeminiEmbeddingProvider } from "./providers/gemini";

// ─── Provider registry ────────────────────────────────────────────────────────
const providers = new Map<string, EmbeddingProvider>();

export function registerEmbeddingProvider(provider: EmbeddingProvider): void {
  providers.set(provider.name, provider);
  console.log(`[Embeddings] Registered provider: ${provider.name} (${provider.dimensions}d)`);
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

// ─── Register built-in providers ─────────────────────────────────────────────
// Add new providers here:
//   registerEmbeddingProvider(new OpenAIEmbeddingProvider());
registerEmbeddingProvider(new GeminiEmbeddingProvider());

export type { EmbeddingProvider } from "./types";
export { vectorStore } from "./store";
