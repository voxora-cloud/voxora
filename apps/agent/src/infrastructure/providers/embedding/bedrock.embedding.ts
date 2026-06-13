import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { EmbeddingProvider } from "./types";
import config from "../../../config";

export class BedrockEmbeddingProvider implements EmbeddingProvider {
  readonly name = "bedrock";
  readonly dimensions: number;

  private client?: BedrockRuntimeClient;
  private model: string;

  constructor() {
    const embedConfig = config.embeddings.bedrock;
    this.model = embedConfig?.model || "amazon.titan-embed-text-v2:0";
    this.dimensions = embedConfig?.dimensions || 1024;
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
    const response = await client.send(
      new InvokeModelCommand({
        modelId: this.model,
        contentType: "application/json",
        accept: "application/json",
        body: JSON.stringify({
          inputText: text,
          dimensions: this.dimensions,
          normalize: true,
        }),
      })
    );

    const result = JSON.parse(new TextDecoder().decode(response.body));
    const embedding = result.embedding;
    if (!Array.isArray(embedding)) {
      throw new Error("Bedrock invokeModel returned unexpected embedding shape");
    }
    return embedding as number[];
  }
}
