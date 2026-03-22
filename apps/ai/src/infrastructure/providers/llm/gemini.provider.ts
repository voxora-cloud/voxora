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
    const { model = this.defaultModel, tools = [], onStream } = options;

    let systemInstruction = messages.find((m) => m.role === "system")?.content;
    let turns = messages.filter((m) => m.role !== "system");

    // Convert to Gemini format
    const contents: any[] = turns.map((m) => {
        if (m.role === "tool") {
            // Function response from a tool execution
            return {
                role: "user",
                parts: [{
                    functionResponse: {
                        name: m.name ?? "unknown_tool",
                        response: JSON.parse(m.content)
                    }
                }]
            };
        }
        return {
            role: m.role === "assistant" ? "model" : "user",
            parts: [{ text: m.content }],
        };
    });

    const config: any = {};
    if (systemInstruction) {
        config.systemInstruction = systemInstruction;
    }

    if (tools.length > 0) {
        config.tools = [{
            functionDeclarations: tools.map(t => {
                const props: any = {};
                for (const [k, v] of Object.entries(t.parameters)) {
                    const paramDef = v as any;
                    const { required, ...rest } = paramDef;
                    props[k] = { ...rest, type: String(paramDef.type).toUpperCase() };
                }
                return {
                    name: t.name,
                    description: t.description,
                    parameters: {
                        type: "OBJECT",
                        properties: props,
                        required: Object.entries(t.parameters).filter(([k, v]) => v.required).map(([k]) => k)
                    }
                };
            })
        }];
    }

    // Tools Loop
    const MAX_TOOL_LOOPS = 5;
    let fullTextResponse = "";

    for (let loop = 0; loop < MAX_TOOL_LOOPS; loop++) {
        fullTextResponse = ""; // Reset for this turn, we only return the final turn's text
        let functionCalls: any[] = [];
        
        if (onStream) {
            const stream = await this.ai.models.generateContentStream({ model, contents, config });
            for await (const chunk of stream) {
                if (chunk.text) {
                    fullTextResponse += chunk.text;
                    onStream(chunk.text, false);
                }
                if (chunk.functionCalls && chunk.functionCalls.length > 0) {
                    functionCalls.push(...chunk.functionCalls);
                }
            }
        } else {
            const response = await this.ai.models.generateContent({ model, contents, config });
            if (response.text) {
                fullTextResponse = response.text;
            }
            if (response.functionCalls && response.functionCalls.length > 0) {
                functionCalls = response.functionCalls;
            }
        }

        if (functionCalls.length === 0) {
            return fullTextResponse || "Sorry, I could not generate a response.";
        }

        // Output function calls block to history to maintain conversational state
        contents.push({
            role: "model",
            parts: functionCalls.map(fc => ({ functionCall: fc }))
        });

        // Execute all tools
        const functionResponses = [];
        for (const call of functionCalls) {
            const tool = tools.find(t => t.name === call.name);
            if (tool) {
                if (onStream) {
                    // Send thought stream to frontend
                    if (call.name === "rewrite_and_think" && call.args && call.args.thought_process) {
                        onStream(`*Thought Process:* ${call.args.thought_process}\n\n`, true);
                    } else if (call.name === "web_crawl") {
                        onStream(`*Searching web for:* ${call.args?.url}... `, true);
                    } else {
                        onStream(`*Executing ${call.name}...*\n`, true);
                    }
                }
                try {
                    const result = await tool.execute(call.args);
                    functionResponses.push({
                        role: "user", // The sdk treats functionResponse as coming from 'user' role
                        parts: [{
                            functionResponse: {
                                name: call.name,
                                response: typeof result === "string" ? JSON.parse(result) : (result as object)
                            }
                        }]
                    });
                    if (onStream && call.name === "web_crawl") {
                        onStream(`✅ Found content.\n`, true);
                    }
                } catch (e: any) {
                    functionResponses.push({
                        role: "user",
                        parts: [{
                            functionResponse: {
                                name: call.name,
                                response: { error: e.message }
                            }
                        }]
                    });
                    if (onStream && call.name === "web_crawl") {
                        onStream(`❌ Failed.\n`, true);
                    }
                }
            }
        }
        
        // Append responses to history and loop again
        contents.push(...functionResponses);
    }
    
    return fullTextResponse || "Tool execution limit reached.";
  }
}
