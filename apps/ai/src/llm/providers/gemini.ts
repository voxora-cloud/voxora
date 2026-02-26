import { GoogleGenAI } from "@google/genai";
import { LLMProvider, LLMMessage, LLMOptions } from "../types";

export class GeminiProvider implements LLMProvider {
  readonly name = "gemini";
  private ai: GoogleGenAI;
  private defaultModel: string;

  constructor() {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is required for GeminiProvider");
    }
    this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    this.defaultModel = process.env.GEMINI_MODEL || "gemini-2.0-flash";
  }

  async generate(messages: LLMMessage[], options: LLMOptions = {}): Promise<string> {
    const { model = this.defaultModel } = options;

    // Split system instruction from conversation turns
    const systemMsg = messages.find((m) => m.role === "system");
    const turns = messages.filter((m) => m.role !== "system");

    // Map to Gemini's multi-turn contents format
    // Gemini uses "model" for assistant role
    const contents = turns.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const response = await this.ai.models.generateContent({
      model,
      contents,
      config: {
        ...(systemMsg ? { systemInstruction: systemMsg.content } : {}),
      },
    });

    return response.text ?? "Sorry, I could not generate a response.";
  }
}
