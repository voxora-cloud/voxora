export interface ModelCapabilities {
  modelId: string;
  contextWindow: number;
  embeddingDimensions?: number;
  supportsStreaming: boolean;
  supportsTools: boolean;
  supportsVision: boolean;
  supportsReasoning: boolean;
}
