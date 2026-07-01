import { OpenAI } from "openai";
import { createHash } from "crypto";
import { EmbeddingProvider } from "../base/embedding.provider";
import { ModelCapabilities } from "../types/ai.types";
import { getEmbeddingModelConfig } from "../registry/model.registry";
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

export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  readonly name = "openai";
  dimensions: number;

  private client?: OpenAI;
  private model: string;

  constructor() {
    const embedConfig = config.embeddings.openai;
    this.model = embedConfig?.model || "text-embedding-3-small";
    this.dimensions = embedConfig?.dimensions || 1536;
  }

  private getClient(): OpenAI {
    if (!this.client) {
      const openaiConfig = config.llm.openai;
      if (!openaiConfig || !openaiConfig.apiKey) {
        throw new Error("OpenAI configuration or API Key is missing");
      }
      this.client = new OpenAI({
        apiKey: openaiConfig.apiKey,
      });
    }
    return this.client;
  }

  private cacheKey(text: string, organizationId?: string): string | null {
    if (!organizationId) return null;
    if (text.length > EMBED_CACHE_MAX_TEXT_LENGTH) return null;
    const hash = createHash("sha256")
      .update(text.trim().toLowerCase())
      .digest("hex")
      .slice(0, 16);
    return `org:${organizationId}:embed:${this.model}:${hash}`;
  }

  async embed(
    text: string,
    options?: { organizationId?: string; conversationId?: string },
  ): Promise<number[]> {
    // ── Cache check ────────────────────────────────────────────────────────
    const key = this.cacheKey(text, options?.organizationId);
    if (key) {
      try {
        const cached = await cacheRedis.getBuffer(key);
        if (cached && cached.length > 0) {
          const embedding = Array.from(
            new Float32Array(cached.buffer, cached.byteOffset, cached.length / 4),
          );
          console.log(
            `[OpenAI Embed] CACHE HIT model=${this.model} chars=${text.length} dims=${embedding.length}`,
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
      const client = this.getClient();
      const registryEntry = getEmbeddingModelConfig(this.model);
      const supportsCustomDimensions = registryEntry?.supportsCustomDimensions ?? true;

      const payload: Record<string, unknown> = {
        model: this.model,
        input: text,
      };

      if (supportsCustomDimensions) {
        payload.dimensions = this.dimensions;
      }

      const response = await client.embeddings.create(payload as any);
      const embedding = response.data[0]?.embedding;

      if (!Array.isArray(embedding)) {
        throw new Error("OpenAI returned unexpected embedding shape");
      }

      // Auto-correct dimensions if different
      if (this.dimensions !== embedding.length) {
        this.dimensions = embedding.length;
      }

      const latencyMs = latencyTracker.stopMs();
      const inputTokens = response.usage?.prompt_tokens ?? Math.ceil(text.length / 4);
      const estimatedCost = estimateCost(
        "openai",
        this.model,
        inputTokens,
        0,
      );

      trackAICall({
        timestamp: new Date().toISOString(),
        provider: "openai",
        modelId: this.model,
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

      // ── Cache write ──────────────────────────────────────────────────────
      if (key) {
        const buf = Buffer.from(new Float32Array(embedding).buffer);
        cacheRedis
          .setex(key, EMBED_CACHE_TTL_SECONDS, buf)
          .catch(() => undefined);
      }

      console.log(
        `[OpenAI Embed] model=${this.model} chars=${text.length} dims=${this.dimensions} latency=${latencyMs.toFixed(0)}ms`,
      );

      return embedding;
    } catch (err: any) {
      const latencyMs = latencyTracker.stopMs();
      const inputTokens = Math.ceil(text.length / 4);
      const estimatedCost = estimateCost(
        "openai",
        this.model,
        inputTokens,
        0,
      );

      trackAICall({
        timestamp: new Date().toISOString(),
        provider: "openai",
        modelId: this.model,
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

  async getModelInfo(modelId?: string): Promise<{ dimensions: number }> {
    const activeModel = modelId ?? this.model;
    const registryEntry = getEmbeddingModelConfig(activeModel);
    if (registryEntry) {
      if (activeModel === this.model) {
        this.dimensions = registryEntry.dimensions;
      }
      return { dimensions: registryEntry.dimensions };
    }
    return { dimensions: this.dimensions };
  }

  async getCapabilities(): Promise<ModelCapabilities> {
    const info = await this.getModelInfo();
    const registryEntry = getEmbeddingModelConfig(this.model);
    return {
      modelId: this.model,
      provider: "openai",
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
