import { Tool, ToolExecutionContext, ToolParameterSchema } from "../agent.types";
import { internalApi } from "../../../infrastructure/api/internal.client";

export class CreateTicketTool implements Tool {
  readonly name = "create_ticket";
  readonly description =
    "Create a support ticket for an issue that cannot be resolved immediately. Use this when the user reports a bug, a complex problem, or requests a follow-up action that requires tracking.";

  readonly parameters: Record<string, ToolParameterSchema> = {
    title: {
      type: "string",
      description: "Short, descriptive title for the ticket.",
      required: true,
    },
    description: {
      type: "string",
      description: "Detailed description of the issue including steps to reproduce or context.",
      required: false,
    },
    priority: {
      type: "string",
      description: "Ticket priority level.",
      required: false,
      enum: ["low", "medium", "high", "urgent"],
    },
    requesterName: {
      type: "string",
      description: "User's full name. Reuse a name already provided earlier in the conversation.",
      required: true,
    },
    requesterEmail: {
      type: "string",
      description: "User's email address. Reuse an email already provided earlier in the conversation.",
      required: true,
    },
    tags: {
      type: "array",
      description: "Relevant tags for categorization (e.g., ['bug', 'billing', 'feature-request']). You must analyze the title and description to extract 1-3 relevant tags to help categorize the issue.",
      required: true,
      items: { type: "string" },
    },
    organizationId: {
      type: "string",
      description: "Organization ID. Injected from runtime context.",
      required: false,
    },
    conversationId: {
      type: "string",
      description: "Conversation ID. Injected from runtime context.",
      required: false,
    },
  };

  async execute(args: Record<string, unknown>, context?: ToolExecutionContext): Promise<unknown> {
    try {
      const title = typeof args.title === "string" ? args.title.trim() : "";
      const description = typeof args.description === "string" ? args.description.trim() : "";
      const requesterName = typeof args.requesterName === "string" ? args.requesterName.trim() : "";
      const requesterEmail = typeof args.requesterEmail === "string" ? args.requesterEmail.trim().toLowerCase() : "";
      const missingFields = [];

      if (!requesterName) missingFields.push("full name");
      if (!requesterEmail) missingFields.push("email address");
      if (!title && !description) missingFields.push("issue details");

      if (missingFields.length > 0) {
        return {
          status: "missing_required_fields",
          missingFields,
          message: `Missing required ticket information: ${missingFields.join(", ")}`,
        };
      }

      if (!this.isValidEmail(requesterEmail)) {
        return {
          status: "invalid_email",
          message: "A valid email address is required before creating a ticket",
        };
      }
      const ticketTitle = title || description.slice(0, 120);

      const organizationId =
        (typeof args.organizationId === "string" ? args.organizationId : "") || context?.organizationId || "";
      const conversationId =
        (typeof args.conversationId === "string" ? args.conversationId : "") || context?.conversationId || "";

      if (!organizationId) return { status: "error", message: "organizationId is required" };

      let tags = Array.isArray(args.tags) ? args.tags.map(String).filter(Boolean) : [];
      if (tags.length === 0) {
        // Fallback intelligent auto-tagger based on title and description keywords
        const content = `${title} ${typeof args.description === "string" ? args.description : ""}`.toLowerCase();
        if (content.includes("bug") || content.includes("error") || content.includes("fail") || content.includes("broken") || content.includes("crash")) {
          tags.push("bug");
        }
        if (content.includes("bill") || content.includes("invoice") || content.includes("payment") || content.includes("charge") || content.includes("refund")) {
          tags.push("billing");
        }
        if (content.includes("feature") || content.includes("request") || content.includes("improve") || content.includes("add") || content.includes("suggest")) {
          tags.push("feature-request");
        }
        if (content.includes("account") || content.includes("login") || content.includes("password") || content.includes("sign") || content.includes("auth")) {
          tags.push("account-access");
        }
        if (tags.length === 0) {
          tags.push("support");
        }
      }

      const payload = {
        organizationId,
        conversationId: conversationId || undefined,
        title: ticketTitle,
        description: description || undefined,
        priority: typeof args.priority === "string" ? args.priority : "medium",
        requesterName,
        requesterEmail,
        tags,
        idempotencyKey: context?.messageId
          ? `ai:create_ticket:${organizationId}:${conversationId || "no-conversation"}:${context.messageId}`
          : undefined,
      };

      const response = await internalApi.post(`/tickets/ai`, payload);

      const ticket = response.data?.data?.ticket;
      return {
        status: "ok",
        message: "Ticket created successfully",
        ticketId: ticket?.id,
        ticketNumber: ticket?.ticketNumber,
      };
    } catch (e: any) {
      return { status: "error", message: e?.response?.data?.message || e.message || "Failed to create ticket" };
    }
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
}
