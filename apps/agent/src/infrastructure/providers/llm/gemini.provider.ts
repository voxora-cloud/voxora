import { GoogleGenAI, Type, Schema } from "@google/genai";
import { LLMProvider, LLMMessage, LLMOptions, LLMGenerateResult, LLMTokenUsage } from "./types";

export class GeminiProvider implements LLMProvider {
  readonly name = "gemini";
  private ai: GoogleGenAI;
  private defaultModel: string;

  constructor() {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is required for GeminiProvider");
    }
    this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    this.defaultModel = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  }

    async generate(messages: LLMMessage[], options: LLMOptions = {}): Promise<LLMGenerateResult> {
        const { model = this.defaultModel, tools = [], toolContext, onStream } = options;

    let systemInstruction = messages.find((m) => m.role === "system")?.content;
    let turns = messages.filter((m) => m.role !== "system");

    
    const contents: any[] = turns.map((m) => {
        if (m.role === "tool") {
            
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
                    const normalized: any = { ...rest, type: String(paramDef.type).toUpperCase() as Type };
                    if (paramDef.items?.type) {
                        normalized.items = {
                            ...paramDef.items,
                            type: String(paramDef.items.type).toUpperCase() as Type,
                        };
                    }
                    props[k] = normalized;
                }

                const requiredKeys = Object.entries(t.parameters)
                    .filter(([k, v]) => v.required)
                    .map(([k]) => k);

                const schema: Schema = {
                    type: Type.OBJECT,
                    properties: props,
                };

                if (requiredKeys.length > 0) {
                    schema.required = requiredKeys;
                }

                return {
                    name: t.name,
                    description: t.description,
                    parameters: schema
                };
            })
        }];
    }

    const safeGetText = (res: any): string => {
        const parts = res.candidates?.[0]?.content?.parts;
        if (!parts) return "";
        return parts.map((p: any) => p.text || "").join("");
    };

    const MAX_TOOL_LOOPS = 5;
    let fullTextResponse = "";
    let usage: LLMTokenUsage | undefined;
    const createTicketResults = new Map<string, unknown>();

    const createTicketRequestKey = (call: any): string | null => {
        if (call.name !== "create_ticket") return null;

        const messageId = toolContext?.messageId;
        if (!messageId) return null;

        const organizationId = toolContext?.organizationId || call.args?.organizationId || "";
        const conversationId = toolContext?.conversationId || call.args?.conversationId || "";
        return `${organizationId}:${conversationId}:${messageId}`;
    };

    for (let loop = 0; loop < MAX_TOOL_LOOPS; loop++) {
        fullTextResponse = ""; 
        let functionCalls: any[] = [];
        
        if (onStream) {
            const stream = await this.ai.models.generateContentStream({ model, contents, config });
            for await (const chunk of stream) {
                const text = safeGetText(chunk);
                if (text) {
                    fullTextResponse += text;
                    onStream(text, false);
                }
                if (chunk.functionCalls && chunk.functionCalls.length > 0) {
                    functionCalls.push(...chunk.functionCalls);
                }
                        if ((chunk as any).usageMetadata) {
                            usage = {
                                promptTokens: (chunk as any).usageMetadata.promptTokenCount,
                                completionTokens: (chunk as any).usageMetadata.candidatesTokenCount,
                                totalTokens: (chunk as any).usageMetadata.totalTokenCount,
                            };
                        }
            }
        } else {
            const response = await this.ai.models.generateContent({ model, contents, config });
            const text = safeGetText(response);
            if (text) {
                fullTextResponse = text;
            }
            if (response.functionCalls && response.functionCalls.length > 0) {
                functionCalls = response.functionCalls;
            }
                    if ((response as any).usageMetadata) {
                        usage = {
                            promptTokens: (response as any).usageMetadata.promptTokenCount,
                            completionTokens: (response as any).usageMetadata.candidatesTokenCount,
                            totalTokens: (response as any).usageMetadata.totalTokenCount,
                        };
                    }
        }

        if (functionCalls.length === 0) {
                        return {
                                text: fullTextResponse || "Sorry, I could not generate a response.",
                                usage,
                        };
        }

        
        contents.push({
            role: "model",
            parts: functionCalls.map(fc => ({ functionCall: fc }))
        });

        
        const functionResponses = [];
        for (const call of functionCalls) {
            const tool = tools.find(t => t.name === call.name);
            if (tool) {
                if (onStream) {
                    
                    if (call.name === "rewrite_and_think" && call.args && call.args.thought_process) {
                        onStream(`*Thought Process:* ${call.args.thought_process}\n\n`, true);
                    } else if (call.name === "web_crawl") {
                        onStream(`*Searching web for:* ${call.args?.url}... `, true);
                    } else {
                        onStream(`*Executing ${call.name}...*\n`, true);
                    }
                }
                try {
                    const requestKey = createTicketRequestKey(call);
                    let result: unknown;
                    if (requestKey && createTicketResults.has(requestKey)) {
                        result = createTicketResults.get(requestKey);
                    } else {
                        result = await tool.execute(call.args, toolContext);
                        if (requestKey) {
                            createTicketResults.set(requestKey, result);
                        }
                    }
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
    
        return {
            text: fullTextResponse || "Tool execution limit reached.",
            usage,
        };
  }
}
