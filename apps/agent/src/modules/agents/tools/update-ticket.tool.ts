import { Tool, ToolExecutionContext, ToolParameterSchema } from "../agent.types";
import { internalApi } from "../../../infrastructure/api/internal.client";

export class UpdateTicketTool implements Tool {
  readonly name = "update_ticket";
  readonly description =
    "Update an existing ticket's fields such as title, description, priority, or status. Use this to update a ticket you previously created or when the user provides more information about an existing issue.";

  readonly parameters: Record<string, ToolParameterSchema> = {
    ticketId: {
      type: "string",
      description: "The MongoDB ID of the ticket to update.",
      required: true,
    },
    title: {
      type: "string",
      description: "Updated title for the ticket.",
      required: false,
    },
    description: {
      type: "string",
      description: "Updated description.",
      required: false,
    },
    priority: {
      type: "string",
      description: "Updated priority.",
      required: false,
      enum: ["low", "medium", "high", "urgent"],
    },
    status: {
      type: "string",
      description: "Updated status.",
      required: false,
      enum: ["open", "in_progress", "resolved", "closed"],
    },
    organizationId: {
      type: "string",
      description: "Organization ID. Injected from runtime context.",
      required: false,
    },
  };

  async execute(args: Record<string, unknown>, context?: ToolExecutionContext): Promise<unknown> {
    try {
      const ticketId = typeof args.ticketId === "string" ? args.ticketId.trim() : "";
      if (!ticketId) return { status: "error", message: "ticketId is required" };

      const organizationId =
        (typeof args.organizationId === "string" ? args.organizationId : "") || context?.organizationId || "";
      if (!organizationId) return { status: "error", message: "organizationId is required" };

      const payload: Record<string, unknown> = { organizationId };
      if (typeof args.title === "string") payload.title = args.title.trim();
      if (typeof args.description === "string") payload.description = args.description.trim();
      if (typeof args.priority === "string") payload.priority = args.priority;
      if (typeof args.status === "string") payload.status = args.status;

      const response = await internalApi.patch(`/tickets/ai/${ticketId}`, payload);

      const ticket = response.data?.data?.ticket;
      return { status: "ok", message: "Ticket updated", ticketId: ticket?.id, ticketNumber: ticket?.ticketNumber };
    } catch (e: any) {
      return { status: "error", message: e?.response?.data?.message || e.message || "Failed to update ticket" };
    }
  }
}
