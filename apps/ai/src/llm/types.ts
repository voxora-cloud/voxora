export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface LLMProvider {
  /** Unique identifier for this provider, e.g. "gemini", "openai", "anthropic" */
  readonly name: string;
  generate(messages: LLMMessage[], options?: LLMOptions): Promise<string>;
}
