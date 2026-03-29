import { Tool, ToolExecutionContext } from "../../../modules/agents/agent.types";

export interface LLMMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  name?: string; // For role = 'tool'
}

export interface LLMOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  tools?: Tool[];
  toolContext?: ToolExecutionContext;
  onStream?: (chunk: string, isThought?: boolean) => void;
}

export interface LLMProvider {
  /** Unique identifier for this provider, e.g. "gemini", "openai", "anthropic" */
  readonly name: string;
  generate(messages: LLMMessage[], options?: LLMOptions): Promise<string>;
}

