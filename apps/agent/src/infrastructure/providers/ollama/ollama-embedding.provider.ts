import axios from "axios";
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

export class OllamaEmbeddingProvider implements EmbeddingProvider {
  readonly name = "ollama";
  dimensions: number;

  private model: string;
  private baseUrl: string;

  constructor() {
    const embedConfig = config.embeddings.ollama;
    const llmConfig = config.llm.ollama;
    const host = llmConfig?.host || "localhost";
    const port = llmConfig?.port || 11434;
    this.baseUrl = `http://${host}:${port}`;
    this.model = embedConfig?.model || "nomic-embed-text";
    this.dimensions = embedConfig?.dimensions || 768;
  }

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
    // ── Cache check ────────────────────────────────────────────────────────
    const key = this.cacheKey(text, options?.organizationId, activeModel);
    if (key) {
      try {
        const cached = await cacheRedis.getBuffer(key);
        if (cached && cached.length > 0) {
          const embedding = Array.from(
            new Float32Array(cached.buffer, cached.byteOffset, cached.length / 4),
          );
          console.log(
            `[Ollama Embed] CACHE HIT model=${activeModel} chars=${text.length} dims=${embedding.length}`,
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
      const response = await axios.post(
        `${this.baseUrl}/api/embeddings`,
        { model: activeModel, prompt: text },
        { timeout: 30000 },
      );

      const embedding = response.data.embedding as number[];
      if (!Array.isArray(embedding)) {
        throw new Error("Ollama returned unexpected embedding shape");
      }

      // Auto-correct dimensions if different
      if (this.dimensions !== embedding.length) {
        this.dimensions = embedding.length;
      }

      const latencyMs = latencyTracker.stopMs();
      const inputTokens = Math.ceil(text.length / 4);

      trackAICall({
        timestamp: new Date().toISOString(),
        provider: "ollama",
        modelId: activeModel,
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
        `[Ollama Embed] model=${activeModel} chars=${text.length} dims=${this.dimensions} latency=${latencyMs.toFixed(0)}ms`,
      );

      return embedding;
    } catch (err: any) {
      const latencyMs = latencyTracker.stopMs();
      const inputTokens = Math.ceil(text.length / 4);

      trackAICall({
        timestamp: new Date().toISOString(),
        provider: "ollama",
        modelId: activeModel,
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
      provider: "ollama",
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
