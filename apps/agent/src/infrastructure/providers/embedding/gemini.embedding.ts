import { GoogleGenAI } from "@google/genai";
import { EmbeddingProvider } from "./types";

export class GeminiEmbeddingProvider implements EmbeddingProvider {
  readonly name = "gemini";
   
  readonly dimensions = 3072;

  private ai?: GoogleGenAI;
  private model: string;

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
    const response = await ai.models.embedContent({
      model: this.model,
      contents: [text],
    });

    const values = response.embeddings?.[0]?.values;
    if (!Array.isArray(values)) {
      throw new Error("Gemini embedContent returned unexpected shape");
    }
    return values as number[];
  }
}
