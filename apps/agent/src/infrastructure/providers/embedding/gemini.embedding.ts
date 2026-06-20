import { GoogleGenAI } from "@google/genai";
import { EmbeddingProvider } from "./types";
import { ModelCapabilities } from "../types";

export class GeminiEmbeddingProvider implements EmbeddingProvider {
  readonly name = "gemini";
   
  dimensions = 3072;

  private ai?: GoogleGenAI;
  private model: string;
  private cachedDimensions?: number;

  constructor() {
    this.model = process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-001";
  }

  private getClient(): GoogleGenAI {
    if (!this.ai) {
      if (!process.env.GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY is required for GeminiEmbeddingProvider");
      }
      this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    }
    return this.ai;
  }

  async embed(text: string): Promise<number[]> {
    const ai = this.getClient();

    // ── Time the actual Gemini HTTP call ──────────────────────────────────
    const t0 = performance.now();
    const response = await ai.models.embedContent({
      model: this.model,
      contents: [text],
    });
    const invokeMs = performance.now() - t0;

    // ── Time the value extraction step ────────────────────────────────────
    const t1 = performance.now();
    const values = response.embeddings?.[0]?.values;
    const extractMs = performance.now() - t1;

    if (!Array.isArray(values)) {
      throw new Error("Gemini embedContent returned unexpected shape");
    }

    const dims = values.length;
    if (this.dimensions !== dims) {
      this.dimensions = dims;
      this.cachedDimensions = dims;
    }

    console.log(
      `[Gemini Embed] model=${this.model} chars=${text.length} ` +
      `invoke=${invokeMs.toFixed(2)}ms extract=${extractMs.toFixed(2)}ms ` +
      `dims=${this.dimensions}`,
    );

    return values as number[];
  }

  async getModelInfo(modelId?: string): Promise<{ dimensions: number }> {
    const activeModel = modelId || this.model;
    if (activeModel === this.model && this.cachedDimensions) {
      return { dimensions: this.cachedDimensions };
    }

    try {
      const ai = this.getClient();
      const response = await ai.models.embedContent({
        model: activeModel,
        contents: ["warmup"],
      });
      const values = response.embeddings?.[0]?.values;
      if (!Array.isArray(values)) {
        throw new Error("Unexpected embedding response shape");
      }
      const dims = values.length;
      if (activeModel === this.model) {
        this.cachedDimensions = dims;
        this.dimensions = dims;
      }
      return { dimensions: dims };
    } catch (err: any) {
      console.warn(`[Gemini Embed] Failed to dynamically detect dimensions: ${err.message}. Falling back to default dimensions.`);
      return { dimensions: this.dimensions };
    }
  }

  async getCapabilities(): Promise<ModelCapabilities> {
    const info = await this.getModelInfo();
    return {
      modelId: this.model,
      contextWindow: 2048,
      embeddingDimensions: info.dimensions,
      supportsStreaming: false,
      supportsTools: false,
      supportsVision: false,
      supportsReasoning: false,
    };
  }
}
