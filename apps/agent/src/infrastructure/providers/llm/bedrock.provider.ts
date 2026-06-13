import {
  BedrockRuntimeClient,
  ConverseCommand,
  ConverseStreamCommand,
  Message,
} from "@aws-sdk/client-bedrock-runtime";
import {
  LLMProvider,
  LLMMessage,
  LLMOptions,
  LLMGenerateResult,
  LLMTokenUsage,
} from "./types";
import config from "../../../config";

export class BedrockProvider implements LLMProvider {
  readonly name = "bedrock";
  private client: BedrockRuntimeClient;
  private defaultModel: string;

  constructor() {
    const bedrockConfig = config.llm.bedrock;
    if (!bedrockConfig) {
      throw new Error("Bedrock configuration is missing in config");
    }

    const clientConfig: any = {
      region: bedrockConfig.region,
    };

    if (bedrockConfig.accessKeyId && bedrockConfig.secretAccessKey) {
      clientConfig.credentials = {
        accessKeyId: bedrockConfig.accessKeyId,
        secretAccessKey: bedrockConfig.secretAccessKey,
      };
    }

    this.client = new BedrockRuntimeClient(clientConfig);
    this.defaultModel = bedrockConfig.model || "us.anthropic.claude-3-5-sonnet-20241022-v2:0";
  }

  async generate(
    messages: LLMMessage[],
    options: LLMOptions = {},
  ): Promise<LLMGenerateResult> {
    const {
      model = this.defaultModel,
      tools = [],
      toolContext,
      onStream,
    } = options;

    // 1. Separate System instruction
    const system = messages
      .filter((m) => m.role === "system")
      .map((m) => ({ text: m.content }));

    // 2. Map other turns to Bedrock's Message structure, ensuring we:
    //    a) Start with a 'user' message
    //    b) Alternate roles strictly (user -> assistant -> user -> assistant...)
    //    c) Merge consecutive turns of the same role
    const nonSystem = messages.filter((m) => m.role === "user" || m.role === "assistant");
    const firstUserIndex = nonSystem.findIndex((m) => m.role === "user");
    const filtered = firstUserIndex !== -1 ? nonSystem.slice(firstUserIndex) : [];

    if (filtered.length === 0) {
      filtered.push({ role: "user", content: "Hello" });
    }

    const merged: { role: "user" | "assistant"; content: string }[] = [];
    for (const msg of filtered) {
      if (merged.length === 0) {
        merged.push({ role: msg.role as "user" | "assistant", content: msg.content });
      } else {
        const last = merged[merged.length - 1];
        if (last.role === msg.role) {
          last.content = `${last.content}\n\n${msg.content}`;
        } else {
          merged.push({ role: msg.role as "user" | "assistant", content: msg.content });
        }
      }
    }

    const converseMessages: Message[] = merged.map((m) => ({
      role: m.role,
      content: [{ text: m.content }],
    }));

    // 3. Map tools definitions to Bedrock schema
    const toolConfig =
      tools.length > 0
        ? {
            tools: tools.map((t) => {
              const properties: Record<string, any> = {};
              const required: string[] = [];

              for (const [k, v] of Object.entries(t.parameters)) {
                const paramDef = v as any;
                const { required: req, ...rest } = paramDef;
                properties[k] = rest;
                if (req) required.push(k);
              }

              return {
                toolSpec: {
                  name: t.name,
                  description: t.description,
                  inputSchema: {
                    json: {
                      type: "object",
                      properties,
                      ...(required.length > 0 ? { required } : {}),
                    },
                  },
                },
              };
            }),
          }
        : undefined;

    const MAX_TOOL_LOOPS = 5;
    let usage: LLMTokenUsage | undefined;
    const createTicketResults = new Map<string, unknown>();

    let loop = 0;
    let responseText = "";
    while (loop < MAX_TOOL_LOOPS) {
      loop++;

      responseText = "";
      let toolUses: any[] = [];

      if (onStream) {
        const command = new ConverseStreamCommand({
          modelId: model,
          messages: converseMessages,
          system,
          toolConfig,
        });

        const response = await this.client.send(command);
        let activeToolUse: {
          toolUseId: string;
          name: string;
          inputString: string;
        } | null = null;

        let insideThinking = false;
        if (response.stream) {
          for await (const chunk of response.stream) {
            // Text delta
            if (chunk.contentBlockDelta?.delta?.text) {
              const text = chunk.contentBlockDelta.delta.text;
              responseText += text;
              
              const lastOpenThinking = responseText.lastIndexOf("<thinking>");
              const lastCloseThinking = responseText.lastIndexOf("</thinking>");
              const lastOpenThought = responseText.lastIndexOf("<thought>");
              const lastCloseThought = responseText.lastIndexOf("</thought>");

              insideThinking = 
                (lastOpenThinking !== -1 && lastOpenThinking > lastCloseThinking) || 
                (lastOpenThought !== -1 && lastOpenThought > lastCloseThought);
              
              onStream(text, insideThinking);
            }

            // Tool use start
            if (chunk.contentBlockStart?.start?.toolUse) {
              const toolUse = chunk.contentBlockStart.start.toolUse;
              activeToolUse = {
                toolUseId: toolUse.toolUseId || "",
                name: toolUse.name || "",
                inputString: "",
              };
            }

            // Tool input delta
            if (chunk.contentBlockDelta?.delta?.toolUse?.input && activeToolUse) {
              activeToolUse.inputString += chunk.contentBlockDelta.delta.toolUse.input;
            }

            // Tool use completed for block
            if (chunk.contentBlockStop && activeToolUse) {
              try {
                const input = JSON.parse(activeToolUse.inputString || "{}");
                toolUses.push({
                  toolUseId: activeToolUse.toolUseId,
                  name: activeToolUse.name,
                  input,
                });
              } catch (err) {
                console.error("Failed to parse tool use input JSON:", activeToolUse.inputString);
              }
              activeToolUse = null;
            }

            // Usage metadata
            if (chunk.metadata?.usage) {
              usage = {
                promptTokens: chunk.metadata.usage.inputTokens,
                completionTokens: chunk.metadata.usage.outputTokens,
                totalTokens:
                  (chunk.metadata.usage.inputTokens || 0) +
                  (chunk.metadata.usage.outputTokens || 0),
              };
            }
          }
        }
      } else {
        const command = new ConverseCommand({
          modelId: model,
          messages: converseMessages,
          system,
          toolConfig,
        });

        const response = await this.client.send(command);

        if (response.output?.message?.content) {
          for (const contentBlock of response.output.message.content) {
            if (contentBlock.text) {
              responseText += contentBlock.text;
            }
            if (contentBlock.toolUse) {
              toolUses.push({
                toolUseId: contentBlock.toolUse.toolUseId,
                name: contentBlock.toolUse.name,
                input: contentBlock.toolUse.input,
              });
            }
          }
        }

        if (response.usage) {
          usage = {
            promptTokens: response.usage.inputTokens,
            completionTokens: response.usage.outputTokens,
            totalTokens:
              (response.usage.inputTokens || 0) +
              (response.usage.outputTokens || 0),
          };
        }
      }

      // If no tool requests are present, the assistant completed its generation
      if (toolUses.length === 0) {
        const cleanText = responseText
          .replace(/<(thinking|thought)>[\s\S]*?<\/\1>/gi, "")
          .trim();
        return {
          text: cleanText || "Sorry, I could not generate a response.",
          usage,
        };
      }

      // Append assistant message with toolUse blocks to history
      converseMessages.push({
        role: "assistant",
        content: toolUses.map((tu) => ({
          toolUse: {
            toolUseId: tu.toolUseId,
            name: tu.name,
            input: tu.input,
          },
        })),
      });

      // Execute each tool and package the responses
      const toolResultsContent: any[] = [];
      for (const call of toolUses) {
        const tool = tools.find((t) => t.name === call.name);
        if (tool) {
          if (onStream) {
            if (call.name === "rewrite_and_think" && call.input?.thought_process) {
              onStream(`*Thought Process:* ${call.input.thought_process}\n\n`, true);
            } else if (call.name === "web_crawl") {
              onStream(`*Searching web for:* ${call.input?.url}... `, true);
            } else {
              onStream(`*Executing ${call.name}...*\n`, true);
            }
          }

          try {
            const requestKey = `${toolContext?.organizationId || ""}:${toolContext?.conversationId || ""}:${toolContext?.messageId || ""}`;
            let result: unknown;

            if (call.name === "create_ticket" && createTicketResults.has(requestKey)) {
              result = createTicketResults.get(requestKey);
            } else {
              result = await tool.execute(call.input, toolContext);
              if (call.name === "create_ticket") {
                createTicketResults.set(requestKey, result);
              }
            }

            toolResultsContent.push({
              toolResult: {
                toolUseId: call.toolUseId,
                status: "success",
                content: [
                  {
                    json:
                      typeof result === "string"
                        ? JSON.parse(result)
                        : (result as object),
                  },
                ],
              },
            });

            if (onStream && call.name === "web_crawl") {
              onStream(`✅ Found content.\n`, true);
            }
          } catch (e: any) {
            toolResultsContent.push({
              toolResult: {
                toolUseId: call.toolUseId,
                status: "error",
                content: [{ text: e.message }],
              },
            });
            if (onStream && call.name === "web_crawl") {
              onStream(`❌ Failed.\n`, true);
            }
          }
        }
      }

      // Append the tool results to the conversation history as a single user message
      converseMessages.push({
        role: "user",
        content: toolResultsContent,
      });
    }

    const finalCleanText = responseText
      .replace(/<(thinking|thought)>[\s\S]*?<\/\1>/gi, "")
      .trim();

    return {
      text: finalCleanText || "Tool execution limit reached.",
      usage,
    };
  }
}
