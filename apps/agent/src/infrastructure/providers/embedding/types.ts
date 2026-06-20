import { ModelCapabilities } from "../types";

export interface EmbeddingProvider {
  readonly name: string;
  readonly dimensions: number;
  embed(text: string): Promise<number[]>;
  getCapabilities(): Promise<ModelCapabilities>;
  getModelInfo(modelId?: string): Promise<{ dimensions: number }>;
}
