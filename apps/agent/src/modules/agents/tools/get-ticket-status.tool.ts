import { Tool, ToolExecutionContext, ToolParameterSchema } from "../agent.types";
import { internalApi } from "../../../infrastructure/api/internal.client";

export class GetTicketStatusTool implements Tool {
  readonly name = "get_ticket_status";
  readonly description =
    "Get safe support ticket status/progress details when a user asks about an existing ticket. Accepts the project's ticket identifier format, including ticket numbers like TKT-... or user-entered references like #123. Organization is injected from runtime context.";

  readonly parameters: Record<string, ToolParameterSchema> = {
    ticketIdentifier: {
      type: "string",
      description: "Ticket identifier provided by the user, such as TKT-... or #123.",
      required: true,
    },
  };

  async execute(args: Record<string, unknown>, context?: ToolExecutionContext): Promise<unknown> {
    try {
      const ticketIdentifier =
        typeof args.ticketIdentifier === "string" ? args.ticketIdentifier.trim() : "";
      const organizationId = context?.organizationId || "";

      if (!ticketIdentifier) {
        return { status: "error", message: "ticketIdentifier is required" };
      }
      if (!organizationId) {
        return { status: "error", message: "organizationId is required" };
      }

      const response = await internalApi.get("/tickets/ai/status", {
        params: { organizationId, ticketIdentifier },
      });

      const ticket = response.data?.data?.ticket;
      return {
        status: "ok",
        ticket: {
          title: ticket?.title || ticket?.subject || null,
          subject: ticket?.subject || ticket?.title || null,
          status: ticket?.status || null,
          priority: ticket?.priority || null,
          assignee: ticket?.assignee || null,
          createdAt: ticket?.createdAt || null,
          updatedAt: ticket?.updatedAt || null,
          latestSummary: ticket?.latestSummary || null,
        },
      };
    } catch (e: any) {
      if (e?.response?.status === 404) {
        return {
          status: "not_found",
          message: "I could not find a ticket with that identifier.",
        };
      }

      return {
        status: "error",
        message: e?.response?.data?.message || e.message || "Failed to get ticket status",
      };
    }
  }
}
