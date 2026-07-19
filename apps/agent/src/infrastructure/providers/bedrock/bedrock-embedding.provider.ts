import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";
import { createHash } from "crypto";
import { EmbeddingProvider } from "../base/embedding.provider";
import { ModelCapabilities } from "../types/ai.types";
import {
  getEmbeddingModelConfig,
} from "../registry/model.registry";
import config from "../../../config";
import { cacheRedis } from "../../cache/redis.client";
import { trackAICall } from "../observability/observability.queue";
import { estimateCost } from "../observability/cost-tracker";
import { LatencyTracker } from "../observability/latency-tracker";

const EMBED_CACHE_TTL_SECONDS = parseInt(
  process.env.EMBED_CACHE_TTL_SECONDS || "3600",
  10,
);
const EMBED_CACHE_MAX_TEXT_LENGTH = parseInt(
  process.env.EMBED_CACHE_MAX_TEXT_LENGTH || "2000",
  10,
);

export class BedrockEmbeddingProvider implements EmbeddingProvider {
  readonly name = "bedrock";
  dimensions: number;

  private client?: BedrockRuntimeClient;
  private model: string;
  private cachedDimensions?: number;

  constructor() {
    const embedConfig = config.embeddings.bedrock;
    this.model = embedConfig?.model || "amazon.titan-embed-text-v2:0";

    // Initialise from the registry; fallback to env / hardcoded default
    const registryEntry = getEmbeddingModelConfig(this.model);
    this.dimensions =
      registryEntry?.dimensions ?? embedConfig?.dimensions ?? 1024;
  }

  private getClient(): BedrockRuntimeClient {
    if (!this.client) {
      const bedrockConfig = config.llm.bedrock;
      if (!bedrockConfig) {
        throw new Error("Bedrock configuration is missing in config");
      }

      const clientConfig: Record<string, unknown> = {
        region: bedrockConfig.region || "us-east-1",
      };

      if (bedrockConfig.accessKeyId && bedrockConfig.secretAccessKey) {
        clientConfig.credentials = {
          accessKeyId: bedrockConfig.accessKeyId,
          secretAccessKey: bedrockConfig.secretAccessKey,
        };
      }

      this.client = new BedrockRuntimeClient(clientConfig as any);
    }
    return this.client;
  }

  /**
   * Build a Redis cache key for an embedding.
   * Returns null if text is too long (caching huge chunks is wasteful)
   * or if orgId is missing (global cache could leak across tenants).
   */
  private cacheKey(text: string, organizationId?: string, modelId?: string): string | null {
    if (!organizationId) return null;
    if (text.length > EMBED_CACHE_MAX_TEXT_LENGTH) return null;
    const hash = createHash("sha256")
      .update(text.trim().toLowerCase())
      .digest("hex")
      .slice(0, 16);
    const activeModel = modelId || this.model;
    return `org:${organizationId}:embed:${activeModel}:${hash}`;
  }

  async embed(
    text: string,
    options?: { organizationId?: string; conversationId?: string; modelId?: string },
  ): Promise<number[]> {
    const activeModel = options?.modelId || this.model;
    // ── Cache check: skip Bedrock for repeated/similar queries ──────────────
    const cacheKey = this.cacheKey(text, options?.organizationId, activeModel);
    if (cacheKey) {
      try {
        const cached = await cacheRedis.getBuffer(cacheKey);
        if (cached && cached.length > 0) {
          const embedding = Array.from(
            new Float32Array(cached.buffer, cached.byteOffset, cached.length / 4),
          );
          console.log(
            `[Bedrock Embed] CACHE HIT model=${activeModel} chars=${text.length} dims=${embedding.length}`,
          );
          return embedding;
        }
      } catch {
        // Cache read failed — proceed to live embed
      }
    }

    const latencyTracker = new LatencyTracker();
    latencyTracker.start();

    try {
      const { embedding, inputTokens } = await this.executeEmbed(text, activeModel);

      const latencyMs = latencyTracker.stopMs();
      const estimatedCost = estimateCost(
        "bedrock",
        activeModel,
        inputTokens,
        0,
      );

      trackAICall({
        timestamp: new Date().toISOString(),
        provider: "bedrock",
        modelId: activeModel,
        callType: "embedding",
        latencyMs,
        inputTokens,
        outputTokens: 0,
        totalTokens: inputTokens,
        estimatedCostUsd: estimatedCost,
        success: true,
        organizationId: options?.organizationId,
        conversationId: options?.conversationId,
      });

      // ── Cache write: store as raw Float32 bytes for compactness ──────────
      if (cacheKey) {
        const buf = Buffer.from(new Float32Array(embedding).buffer);
        cacheRedis
          .setex(cacheKey, EMBED_CACHE_TTL_SECONDS, buf)
          .catch(() => undefined);
      }

      return embedding;
    } catch (err: any) {
      const latencyMs = latencyTracker.stopMs();
      const inputTokens = Math.ceil(text.length / 4);
      const estimatedCost = estimateCost(
        "bedrock",
        activeModel,
        inputTokens,
        0,
      );

      trackAICall({
        timestamp: new Date().toISOString(),
        provider: "bedrock",
        modelId: activeModel,
        callType: "embedding",
        latencyMs,
        inputTokens,
        outputTokens: 0,
        totalTokens: inputTokens,
        estimatedCostUsd: estimatedCost,
        success: false,
        error: err instanceof Error ? err.message : String(err),
        organizationId: options?.organizationId,
        conversationId: options?.conversationId,
      });

      throw err;
    }
  }

  private async executeEmbed(
    text: string,
    modelId: string,
  ): Promise<{ embedding: number[]; inputTokens: number }> {
    const client = this.getClient();

    // Registry-driven: no more if (model.includes("titan-embed-text-v1"))
    const registryEntry = getEmbeddingModelConfig(modelId);
    const supportsCustomDimensions =
      registryEntry?.supportsCustomDimensions ?? true;

    const payload: Record<string, unknown> = { inputText: text };
    if (supportsCustomDimensions) {
      payload.dimensions = this.dimensions;
      payload.normalize = true;
    }

    const t0 = performance.now();
    const response = await client.send(
      new InvokeModelCommand({
        modelId: modelId,
        contentType: "application/json",
        accept: "application/json",
        body: JSON.stringify(payload),
      }),
    );
    const invokeMs = performance.now() - t0;

    const t1 = performance.now();
    const result = JSON.parse(new TextDecoder().decode(response.body)) as {
      embedding?: number[];
      inputTextTokenCount?: number;
    };
    const decodeMs = performance.now() - t1;

    const embedding = result.embedding;
    if (!Array.isArray(embedding)) {
      throw new Error(
        "Bedrock invokeModel returned unexpected embedding shape",
      );
    }

    // Auto-correct cached dimension if the API returns something different
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

    const inputTokens = result.inputTextTokenCount ?? Math.ceil(text.length / 4);

    return { embedding, inputTokens };
  }

  async getModelInfo(
    modelId?: string,
  ): Promise<{ dimensions: number }> {
    const activeModel = modelId ?? this.model;

    // 1. Registry-first — no warmup API call needed for known models
    const registryEntry = getEmbeddingModelConfig(activeModel);
    if (registryEntry) {
      if (activeModel === this.model) {
        this.cachedDimensions = registryEntry.dimensions;
        this.dimensions = registryEntry.dimensions;
      }
      return { dimensions: registryEntry.dimensions };
    }

    // 2. Cache hit for already-probed unknown models
    if (activeModel === this.model && this.cachedDimensions) {
      return { dimensions: this.cachedDimensions };
    }

    // 3. Live probe for models not in registry
    try {
      const client = this.getClient();
      const probePayload: Record<string, unknown> = { inputText: "warmup" };

      // Unknown model — assume it supports custom dimensions and use a safe default
      probePayload.dimensions = 1024;
      probePayload.normalize = true;

      const response = await client.send(
        new InvokeModelCommand({
          modelId: activeModel,
          contentType: "application/json",
          accept: "application/json",
          body: JSON.stringify(probePayload),
        }),
      );
      const parsed = JSON.parse(
        new TextDecoder().decode(response.body),
      ) as { embedding?: number[] };

      const embedding = parsed.embedding;
      if (!Array.isArray(embedding)) {
        throw new Error("Unexpected embedding response shape");
      }
      const dims = embedding.length;
      if (activeModel === this.model) {
        this.cachedDimensions = dims;
        this.dimensions = dims;
      }
      return { dimensions: dims };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn(
        `[Bedrock Embed] Failed to probe dimensions for ${activeModel}: ${message}. Using default.`,
      );
      return { dimensions: this.dimensions };
    }
  }

  async getCapabilities(): Promise<ModelCapabilities> {
    const info = await this.getModelInfo();
    const registryEntry = getEmbeddingModelConfig(this.model);
    return {
      modelId: this.model,
      provider: "bedrock",
      contextWindow: 8_192,
      embeddingDimensions: info.dimensions,
      supportsStreaming: false,
      supportsTools: false,
      supportsVision: false,
      supportsReasoning: false,
      supportsCustomDimensions: registryEntry?.supportsCustomDimensions ?? true,
    };
  }
}
