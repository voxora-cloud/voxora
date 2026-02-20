import { LLMProvider } from "./types";
import { GeminiProvider } from "./gemini";

// ─── Provider registry ────────────────────────────────────────────────────────
const providers = new Map<string, LLMProvider>();

export function registerProvider(provider: LLMProvider): void {
  providers.set(provider.name, provider);
  console.log(`[LLM] Registered provider: ${provider.name}`);
}

export function getProvider(name: string): LLMProvider {
  const provider = providers.get(name);
  if (!provider) {
    throw new Error(
      `LLM provider "${name}" is not registered. Available: [${[...providers.keys()].join(", ")}]`,
    );
  }
  return provider;
}

export function getDefaultProvider(): LLMProvider {
  const name = process.env.LLM_PROVIDER || "gemini";
  return getProvider(name);
}

// ─── Register built-in providers ─────────────────────────────────────────────
// Add new providers here as they are implemented, e.g.:
//   registerProvider(new OpenAIProvider());
//   registerProvider(new AnthropicProvider());
registerProvider(new GeminiProvider());

export type { LLMProvider, LLMMessage, LLMOptions } from "./types";
