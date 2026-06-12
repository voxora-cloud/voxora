import { Tool, ToolExecutionContext, ToolParameterSchema } from "../agent.types";
import { internalApi } from "../../../infrastructure/api/internal.client";

export class CloseTicketTool implements Tool {
  readonly name = "close_ticket";
  readonly description =
    "Close a ticket with an optional resolution note. Use this when the user's issue has been resolved and the ticket should be marked as closed.";

  readonly parameters: Record<string, ToolParameterSchema> = {
    ticketId: {
      type: "string",
      description: "The MongoDB ID of the ticket to close.",
      required: true,
    },
    resolutionNote: {
      type: "string",
      description: "Brief note explaining how the issue was resolved.",
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
      const ticketId = typeof args.ticketId === "string" ? args.ticketId.trim() : "";
      if (!ticketId) return { status: "error", message: "ticketId is required" };

      const organizationId =
        (typeof args.organizationId === "string" ? args.organizationId : "") || context?.organizationId || "";
      if (!organizationId) return { status: "error", message: "organizationId is required" };

      const payload: Record<string, unknown> = { organizationId };
      if (typeof args.resolutionNote === "string") payload.resolutionNote = args.resolutionNote.trim();

      const response = await internalApi.patch(`/tickets/ai/${ticketId}/close`, payload);

      const ticket = response.data?.data?.ticket;
      return {
        status: "ok",
        message: "Ticket closed",
        ticketId: ticket?.id,
        ticketNumber: ticket?.ticketNumber,
        closedAt: ticket?.closedAt,
      };
    } catch (e: any) {
      return { status: "error", message: e?.response?.data?.message || e.message || "Failed to close ticket" };
    }
  }
}
