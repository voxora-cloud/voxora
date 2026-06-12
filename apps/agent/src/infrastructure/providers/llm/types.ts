import { Tool, ToolExecutionContext } from "../../../modules/agents/agent.types";

export interface LLMMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  name?: string; 
}

export interface LLMOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  tools?: Tool[];
  toolContext?: ToolExecutionContext;
  onStream?: (chunk: string, isThought?: boolean) => void;
}

export interface LLMTokenUsage {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

export interface LLMGenerateResult {
  text: string;
  usage?: LLMTokenUsage;
}

export interface LLMProvider {
   
  readonly name: string;
  generate(messages: LLMMessage[], options?: LLMOptions): Promise<LLMGenerateResult>;
}

