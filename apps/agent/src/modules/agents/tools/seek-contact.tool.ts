import { Tool, ToolExecutionContext, ToolParameterSchema } from "../agent.types";
import { internalApi } from "../../../infrastructure/api/internal.client";

export class SeekContactTool implements Tool {
  readonly name = "seek_contact";
  readonly description =
    "Search for an existing contact in the organization's CRM by email, phone, or name. Use this to look up a user's history before starting a conversation or to check if a contact already exists.";

  readonly parameters: Record<string, ToolParameterSchema> = {
    email: {
      type: "string",
      description: "Email address to search for.",
      required: false,
    },
    phone: {
      type: "string",
      description: "Phone number to search for.",
      required: false,
    },
    name: {
      type: "string",
      description: "Contact name to search for.",
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
      const organizationId =
        (typeof args.organizationId === "string" ? args.organizationId : "") || context?.organizationId || "";
      if (!organizationId) return { status: "error", message: "organizationId is required" };

      const email = typeof args.email === "string" ? args.email.trim() : undefined;
      const phone = typeof args.phone === "string" ? args.phone.trim() : undefined;
      const name = typeof args.name === "string" ? args.name.trim() : undefined;

      if (!email && !phone && !name) {
        return { status: "error", message: "At least one of email, phone, or name is required" };
      }

      const params: Record<string, string> = { organizationId };
      if (email) params.email = email;
      else if (phone) params.phone = phone;
      else if (name) params.name = name;

      const response = await internalApi.get(`/contacts/ai/seek`, {
        params,
      });

      const data = response.data?.data;
      return {
        status: "ok",
        found: data?.found || false,
        contact: data?.contact || null,
      };
    } catch (e: any) {
      return { status: "error", message: e?.response?.data?.message || e.message || "Failed to seek contact" };
    }
  }
}
