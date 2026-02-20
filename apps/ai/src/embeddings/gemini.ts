import { GoogleGenAI } from "@google/genai";
import { EmbeddingProvider } from "./types";

export class GeminiEmbeddingProvider implements EmbeddingProvider {
  readonly name = "gemini";
  /** text-embedding-004 outputs 768-dimensional vectors */
  readonly dimensions = 768;

  private ai: GoogleGenAI;
  private model: string;

  constructor() {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is required for GeminiEmbeddingProvider");
    }
    this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    this.model = process.env.GEMINI_EMBEDDING_MODEL || "text-embedding-004";
  }

  async embed(text: string): Promise<number[]> {
    const result = await this.ai.models.embedContent({
      model: this.model,
      contents: text,
    });

    const values = (result as any).embeddings?.[0]?.values;
    if (!Array.isArray(values)) {
      throw new Error("Gemini embedContent returned unexpected shape");
    }
    return values as number[];
  }
}
