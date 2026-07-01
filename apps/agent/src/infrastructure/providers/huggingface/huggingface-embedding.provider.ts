import { InferenceClient } from "@huggingface/inference";
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

export class HuggingFaceEmbeddingProvider implements EmbeddingProvider {
  readonly name = "huggingface";
  dimensions: number;

  private client: InferenceClient;
  private model: string;

  constructor() {
    const embedConfig = config.embeddings.huggingface;
    this.model = embedConfig?.model || "sentence-transformers/all-MiniLM-L6-v2";
    this.dimensions = embedConfig?.dimensions || 384;
    this.client = new InferenceClient(config.llm.huggingface?.token || "", {
      endpointUrl: embedConfig?.endpointUrl || undefined,
    });
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
            `[Hugging Face Embed] CACHE HIT model=${this.model} chars=${text.length} dims=${embedding.length}`,
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
      const result = await this.client.featureExtraction({
        model: this.model,
        inputs: text,
      });

      let embedding: number[];
      if (Array.isArray(result)) {
        if (typeof result[0] === "number") {
          embedding = result as number[];
        } else if (Array.isArray(result[0])) {
          const first = result[0];
          if (typeof first[0] === "number") {
            embedding = first as number[];
          } else if (Array.isArray(first[0])) {
            embedding = (first as any).flat().filter((x: any) => typeof x === "number");
          } else {
            throw new Error("Unexpected nested embedding structure");
          }
        } else {
          throw new Error("Unexpected embedding element type");
        }
      } else {
        throw new Error("Unexpected embedding response type from Hugging Face");
      }

      if (!embedding || embedding.length === 0) {
        throw new Error("Hugging Face feature extraction returned empty embedding");
      }

      // Auto-correct dimensions if different
      if (this.dimensions !== embedding.length) {
        this.dimensions = embedding.length;
      }

      const latencyMs = latencyTracker.stopMs();
      const inputTokens = Math.ceil(text.length / 4);

      trackAICall({
        timestamp: new Date().toISOString(),
        provider: "huggingface",
        modelId: this.model,
        callType: "embedding",
        latencyMs,
        inputTokens,
        outputTokens: 0,
        totalTokens: inputTokens,
        estimatedCostUsd: 0,
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
        `[Hugging Face Embed] model=${this.model} chars=${text.length} dims=${this.dimensions} latency=${latencyMs.toFixed(0)}ms`,
      );

      return embedding;
    } catch (err: any) {
      const latencyMs = latencyTracker.stopMs();
      const inputTokens = Math.ceil(text.length / 4);

      trackAICall({
        timestamp: new Date().toISOString(),
        provider: "huggingface",
        modelId: this.model,
        callType: "embedding",
        latencyMs,
        inputTokens,
        outputTokens: 0,
        totalTokens: inputTokens,
        estimatedCostUsd: 0,
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
    return {
      modelId: this.model,
      provider: "huggingface",
      contextWindow: 8_192,
      embeddingDimensions: info.dimensions,
      supportsStreaming: false,
      supportsTools: false,
      supportsVision: false,
      supportsReasoning: false,
      supportsCustomDimensions: false,
    };
  }
}
