import { Tool, ToolExecutionContext, ToolParameterSchema } from "../agent.types";
import { internalApi } from "../../../infrastructure/api/internal.client";

export class ConversationMemoryTool implements Tool {
  readonly name = "conversation_memory";
  readonly description =
    "Retrieve recent message history for the current conversation. Use this to recall what was said earlier in the chat so you can give consistent, context-aware responses.";

  readonly parameters: Record<string, ToolParameterSchema> = {
    limit: {
      type: "number",
      description: "Number of recent messages to retrieve (default: 10, max: 30).",
      required: false,
    },
    conversationId: {
      type: "string",
      description: "Conversation ID. Injected from runtime context.",
      required: false,
    },
    organizationId: {
      type: "string",
      description: "Organization ID. Injected from runtime context.",
      required: false,
    },
  };

  async execute(args: Record<string, unknown>, context?: ToolExecutionContext): Promise<unknown> {
    try {
      const conversationId =
        (typeof args.conversationId === "string" ? args.conversationId : "") ||
        context?.conversationId || "";
      const organizationId =
        (typeof args.organizationId === "string" ? args.organizationId : "") ||
        context?.organizationId || "";

      if (!conversationId || !organizationId) {
        return { status: "error", message: "conversationId and organizationId are required" };
      }

      const limit = typeof args.limit === "number" ? Math.min(args.limit, 30) : 10;

      const response = await internalApi.get(
        `/conversations/ai/${conversationId}/memory`,
        { params: { organizationId, limit } },
      );

      return { status: "ok", memory: response.data?.data?.memory || [] };
    } catch (e: any) {
      return { status: "error", message: e?.response?.data?.message || e.message || "Failed to retrieve memory" };
    }
  }
}
