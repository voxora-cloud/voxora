import { Tool, ToolExecutionContext, ToolParameterSchema } from "../agent.types";
import { internalApi } from "../../../infrastructure/api/internal.client";

export class EscalateToHumanTool implements Tool {
  readonly name = "escalate_to_human";
  readonly description =
    "Escalate the current conversation to a human agent when you cannot resolve the issue, when the user explicitly requests a human, or when the topic is sensitive. The system will auto-assign to the least-busy available agent (agent > admin > owner).";

  readonly parameters: Record<string, ToolParameterSchema> = {
    reason: {
      type: "string",
      description: "Reason for escalation. Will be shown to the human agent.",
      required: false,
    },
    agentId: {
      type: "string",
      description: "Optional specific agent ID to route to. If omitted, auto-assigns to least-busy available agent.",
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
        (typeof args.conversationId === "string" ? args.conversationId : "") || context?.conversationId || "";
      const organizationId =
        (typeof args.organizationId === "string" ? args.organizationId : "") || context?.organizationId || "";

      if (!conversationId || !organizationId) {
        return { status: "error", message: "conversationId and organizationId are required" };
      }

      const payload: Record<string, unknown> = { organizationId };
      if (typeof args.reason === "string") payload.reason = args.reason.trim();
      if (typeof args.agentId === "string" && args.agentId.trim()) payload.agentId = args.agentId.trim();

      const response = await internalApi.post(
        `/conversations/ai/${conversationId}/escalate`,
        payload,
      );

      const data = response.data?.data;
      return {
        status: "ok",
        message: data?.assignedAgent
          ? `Escalated to ${data.agentName || "human agent"}`
          : "Escalated — awaiting available agent",
        assignedAgent: data?.assignedAgent || null,
        agentName: data?.agentName || null,
        conversationStatus: data?.status || "pending",
      };
    } catch (e: any) {
      return { status: "error", message: e?.response?.data?.message || e.message || "Escalation failed" };
    }
  }
}
