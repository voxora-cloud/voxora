import { Tool, ToolExecutionContext, ToolParameterSchema } from "../agent.types";
import { internalApi } from "../../../infrastructure/api/internal.client";

export class UpdateContactProfileTool implements Tool {
  readonly name = "update_contact_profile";
  readonly description = "Persist visitor contact information (name, email, phone) to InteraOne contacts database. Use this immediately when the visitor shares contact details.";

  readonly parameters: Record<string, ToolParameterSchema> = {
    name: {
      type: "string",
      description: "Visitor full name when provided.",
      required: false,
    },
    email: {
      type: "string",
      description: "Visitor email address when provided.",
      required: false,
    },
    phone: {
      type: "string",
      description: "Visitor phone number when provided.",
      required: false,
    },
    company: {
      type: "string",
      description: "Visitor company/organization name.",
      required: false,
    },
    tags: {
      type: "array",
      description: "CRM tags inferred from conversation (e.g., VIP, Billing, At Risk).",
      required: false,
      items: { type: "string" },
    },
    note: {
      type: "string",
      description: "Internal AI note summarizing actionable context.",
      required: false,
    },
    status: {
      type: "string",
      description: "Contact status classification.",
      required: false,
      enum: ["active", "inactive", "blocked"],
    },
    sentiment: {
      type: "string",
      description: "Overall customer sentiment inferred by AI.",
      required: false,
      enum: ["positive", "neutral", "negative"],
    },
    summary: {
      type: "string",
      description: "Short AI insight summary for contact profile.",
      required: false,
    },
    topics: {
      type: "array",
      description: "Key topics extracted by AI from conversation.",
      required: false,
      items: { type: "string" },
    },
    timelineLabel: {
      type: "string",
      description: "Timeline event label to append.",
      required: false,
    },
    timelineDetail: {
      type: "string",
      description: "Timeline event optional detail.",
      required: false,
    },
    organizationId: {
      type: "string",
      description: "Organization ID. Usually injected from runtime context.",
      required: false,
    },
    conversationId: {
      type: "string",
      description: "Conversation ID. Usually injected from runtime context.",
      required: false,
    },
  };

  async execute(args: Record<string, unknown>, context?: ToolExecutionContext): Promise<unknown> {
    try {
      const name = typeof args.name === "string" ? args.name.trim() : "";
      const email = typeof args.email === "string" ? args.email.trim() : "";
      const phone = typeof args.phone === "string" ? args.phone.trim() : "";
      const company = typeof args.company === "string" ? args.company.trim() : "";
      const note = typeof args.note === "string" ? args.note.trim() : "";
      const summary = typeof args.summary === "string" ? args.summary.trim() : "";
      const timelineLabel = typeof args.timelineLabel === "string" ? args.timelineLabel.trim() : "";
      const timelineDetail = typeof args.timelineDetail === "string" ? args.timelineDetail.trim() : "";
      const status =
        typeof args.status === "string" && ["active", "inactive", "blocked"].includes(args.status)
          ? (args.status as "active" | "inactive" | "blocked")
          : undefined;
      const sentiment =
        typeof args.sentiment === "string" && ["positive", "neutral", "negative"].includes(args.sentiment)
          ? (args.sentiment as "positive" | "neutral" | "negative")
          : undefined;
      const tags = Array.isArray(args.tags)
        ? args.tags.map((tag) => String(tag || "").trim()).filter(Boolean)
        : [];
      const topics = Array.isArray(args.topics)
        ? args.topics.map((topic) => String(topic || "").trim()).filter(Boolean)
        : [];

      if (!name && !email && !phone && !company && tags.length === 0 && !note && !sentiment && !summary && topics.length === 0 && !timelineLabel) {
        throw new Error("At least one contact field is required");
      }

      const organizationId =
        (typeof args.organizationId === "string" ? args.organizationId : "") ||
        context?.organizationId ||
        "";
      const conversationId =
        (typeof args.conversationId === "string" ? args.conversationId : "") ||
        context?.conversationId ||
        "";

      if (!organizationId || !conversationId) {
        throw new Error("organizationId and conversationId are required for contact persistence");
      }

      const response = await internalApi.post("/contacts/ai/upsert", {
        organizationId,
        conversationId,
        ...(name ? { name } : {}),
        ...(email ? { email } : {}),
        ...(phone ? { phone } : {}),
        ...(company ? { company } : {}),
        ...(tags.length > 0 ? { tags } : {}),
        ...(note ? { note } : {}),
        ...(status ? { status } : {}),
        ...(sentiment ? { sentiment } : {}),
        ...(summary ? { summary } : {}),
        ...(topics.length > 0 ? { topics } : {}),
        ...(timelineLabel ? { timelineLabel } : {}),
        ...(timelineDetail ? { timelineDetail } : {}),
      });

      return {
        status: "success",
        message: "Contact profile updated via API",
        data: response.data?.data?.contact || null,
      };
    } catch (e: any) {
      return {
        status: "error",
        message: e?.response?.data?.message || e.message || "Failed to update contact profile",
      };
    }
  }
}
