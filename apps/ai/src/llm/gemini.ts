import { GoogleGenAI } from "@google/genai";
import { LLMProvider, LLMMessage, LLMOptions } from "./types";

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

    // Build a single prompt string from the message thread.
    // When tools / multi-turn support land, replace this with the Gemini
    // multi-turn chat API (ai.chats.create).
    const prompt = messages
      .map((m) => {
        if (m.role === "system") return `System: ${m.content}`;
        if (m.role === "assistant") return `Assistant: ${m.content}`;
        return `User: ${m.content}`;
      })
      .join("\n\n");

    const result = await this.ai.models.generateContent({
      model,
      contents: prompt,
    });

    return result.text ?? "Sorry, I could not generate a response.";
  }
}
