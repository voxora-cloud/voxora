import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { EmbeddingProvider } from "./types";
import { ModelCapabilities } from "../types";
import config from "../../../config";

export class BedrockEmbeddingProvider implements EmbeddingProvider {
  readonly name = "bedrock";
  dimensions: number;

  private client?: BedrockRuntimeClient;
  private model: string;
  private cachedDimensions?: number;

  constructor() {
    const embedConfig = config.embeddings.bedrock;
    this.model = embedConfig?.model || "amazon.titan-embed-text-v2:0";
    if (this.model.includes("titan-embed-text-v1")) {
      this.dimensions = 1536;
    } else {
      this.dimensions = embedConfig?.dimensions || 1024;
    }
  }

  private getClient(): BedrockRuntimeClient {
    if (!this.client) {
      const bedrockConfig = config.llm.bedrock;
      if (!bedrockConfig) {
        throw new Error("Bedrock configuration is missing in config");
      }

      const clientConfig: any = {
        region: bedrockConfig.region || "us-east-1",
      };

      if (bedrockConfig.accessKeyId && bedrockConfig.secretAccessKey) {
        clientConfig.credentials = {
          accessKeyId: bedrockConfig.accessKeyId,
          secretAccessKey: bedrockConfig.secretAccessKey,
        };
      }

      this.client = new BedrockRuntimeClient(clientConfig);
    }
    return this.client;
  }

  async embed(text: string): Promise<number[]> {
    const client = this.getClient();

    const isTitanV1 = this.model.includes("titan-embed-text-v1");
    const payload: Record<string, any> = {
      inputText: text,
    };

    if (!isTitanV1) {
      payload.dimensions = this.dimensions;
      payload.normalize = true;
    }

    const body = JSON.stringify(payload);

    // ── Time the actual Bedrock HTTP call ─────────────────────────────────
    const t0 = performance.now();
    const response = await client.send(
      new InvokeModelCommand({
        modelId: this.model,
        contentType: "application/json",
        accept: "application/json",
        body,
      })
    );
    const invokeMs = performance.now() - t0;

    // ── Time the decode + parse step ──────────────────────────────────────
    const t1 = performance.now();
    const result = JSON.parse(new TextDecoder().decode(response.body));
    const decodeMs = performance.now() - t1;

    const embedding = result.embedding;
    if (!Array.isArray(embedding)) {
      throw new Error("Bedrock invokeModel returned unexpected embedding shape");
    }

    const dims = embedding.length;
    if (this.dimensions !== dims) {
      this.dimensions = dims;
      this.cachedDimensions = dims;
    }

    console.log(
      `[Bedrock Embed] model=${this.model} chars=${text.length} ` +
      `invoke=${invokeMs.toFixed(2)}ms decode=${decodeMs.toFixed(2)}ms ` +
      `dims=${this.dimensions}`,
    );

    return embedding as number[];
  }

  async getModelInfo(modelId?: string): Promise<{ dimensions: number }> {
    const activeModel = modelId || this.model;
    if (activeModel === this.model && this.cachedDimensions) {
      return { dimensions: this.cachedDimensions };
    }

    try {
      const client = this.getClient();
      const isTitanV1 = activeModel.includes("titan-embed-text-v1");
      const payload: Record<string, any> = {
        inputText: "warmup",
      };
      if (!isTitanV1) {
        payload.dimensions = activeModel === this.model ? this.dimensions : 1024;
        payload.normalize = true;
      }

      const response = await client.send(
        new InvokeModelCommand({
          modelId: activeModel,
          contentType: "application/json",
          accept: "application/json",
          body: JSON.stringify(payload),
        })
      );
      const result = JSON.parse(new TextDecoder().decode(response.body));
      const embedding = result.embedding;
      if (!Array.isArray(embedding)) {
        throw new Error("Unexpected embedding response shape");
      }
      const dims = embedding.length;
      if (activeModel === this.model) {
        this.cachedDimensions = dims;
        this.dimensions = dims;
      }
      return { dimensions: dims };
    } catch (err: any) {
      console.warn(`[Bedrock Embed] Failed to dynamically detect dimensions: ${err.message}. Falling back to default dimensions.`);
      return { dimensions: this.dimensions };
    }
  }

  async getCapabilities(): Promise<ModelCapabilities> {
    const info = await this.getModelInfo();
    return {
      modelId: this.model,
      contextWindow: 8192,
      embeddingDimensions: info.dimensions,
      supportsStreaming: false,
      supportsTools: false,
      supportsVision: false,
      supportsReasoning: false,
    };
  }
}
