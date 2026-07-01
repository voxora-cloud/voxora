import { LLMGenerateResult, LLMMessage, LLMOptions, ModelCapabilities } from "../types/ai.types";

export interface LLMProvider {
  /** Unique name of this provider, e.g. "bedrock" */
  readonly name: string;
  generate(messages: LLMMessage[], options?: LLMOptions): Promise<LLMGenerateResult>;
  getCapabilities(modelId?: string): Promise<ModelCapabilities>;
}
