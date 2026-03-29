import axios from "axios";
import mongoose from "mongoose";
import { Tool, ToolExecutionContext, ToolParameterSchema } from "../agent.types";
import { connectDB, ContactModel, ConversationModel } from "../../../shared/db/db";

export class UpdateContactProfileTool implements Tool {
  readonly name = "update_contact_profile";
  readonly description = "Persist visitor contact information (name, email, phone) to Voxora contacts database. Use this immediately when the visitor shares contact details.";

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

      const writeMode = (process.env.AI_CONTACT_WRITE_MODE || "direct").toLowerCase();

      if (writeMode === "api") {
        return await this.writeViaApi({
          organizationId,
          conversationId,
          name,
          email,
          phone,
          company,
          tags,
          note,
          status,
          sentiment,
          summary,
          topics,
          timelineLabel,
          timelineDetail,
        });
      }

      return await this.writeDirectToMongo({
        organizationId,
        conversationId,
        name,
        email,
        phone,
        company,
        tags,
        note,
        status,
        sentiment,
        summary,
        topics,
        timelineLabel,
        timelineDetail,
      });
    } catch (e: any) {
      return {
        status: "error",
        message: e?.response?.data?.message || e.message || "Failed to update contact profile",
      };
    }
  }

  private async writeViaApi(input: {
    organizationId: string;
    conversationId: string;
    name?: string;
    email?: string;
    phone?: string;
    company?: string;
    tags?: string[];
    note?: string;
    status?: "active" | "inactive" | "blocked";
    sentiment?: "positive" | "neutral" | "negative";
    summary?: string;
    topics?: string[];
    timelineLabel?: string;
    timelineDetail?: string;
  }): Promise<unknown> {
    const {
      organizationId,
      conversationId,
      name,
      email,
      phone,
      company,
      tags,
      note,
      status,
      sentiment,
      summary,
      topics,
      timelineLabel,
      timelineDetail,
    } = input;

      const apiUrl = (process.env.AI_CONTACT_API_URL || "http://localhost:3002/api/v1").replace(/\/$/, "");
      const secret = process.env.AI_TOOL_SECRET;

      const response = await axios.post(
        `${apiUrl}/contacts/ai/upsert`,
        {
          organizationId,
          conversationId,
          ...(name ? { name } : {}),
          ...(email ? { email } : {}),
          ...(phone ? { phone } : {}),
          ...(company ? { company } : {}),
          ...(tags && tags.length > 0 ? { tags } : {}),
          ...(note ? { note } : {}),
          ...(status ? { status } : {}),
          ...(sentiment ? { sentiment } : {}),
          ...(summary ? { summary } : {}),
          ...(topics && topics.length > 0 ? { topics } : {}),
          ...(timelineLabel ? { timelineLabel } : {}),
          ...(timelineDetail ? { timelineDetail } : {}),
        },
        {
          headers: {
            ...(secret ? { "x-ai-tool-secret": secret } : {}),
          },
          timeout: 10000,
        },
      );

      return {
        status: "success",
        message: "Contact profile updated via API",
        data: response.data?.data?.contact || null,
      };
  }

  private async writeDirectToMongo(input: {
    organizationId: string;
    conversationId: string;
    name?: string;
    email?: string;
    phone?: string;
    company?: string;
    tags?: string[];
    note?: string;
    status?: "active" | "inactive" | "blocked";
    sentiment?: "positive" | "neutral" | "negative";
    summary?: string;
    topics?: string[];
    timelineLabel?: string;
    timelineDetail?: string;
  }): Promise<unknown> {
    const {
      organizationId,
      conversationId,
      name,
      email,
      phone,
      company,
      tags,
      note,
      status,
      sentiment,
      summary,
      topics,
      timelineLabel,
      timelineDetail,
    } = input;

    if (!mongoose.Types.ObjectId.isValid(organizationId)) {
      throw new Error("Invalid organizationId");
    }
    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      throw new Error("Invalid conversationId");
    }

    await connectDB();

    const ConversationDb = ConversationModel as any;
    const ContactDb = ContactModel as any;

    const orgId = new mongoose.Types.ObjectId(organizationId);
    const convId = new mongoose.Types.ObjectId(conversationId);

    const conversation = (await ConversationDb.findOne({
      _id: convId,
      organizationId: orgId,
    }).lean()) as any;

    if (!conversation) {
      throw new Error("Conversation not found for organization");
    }

    const sessionId = conversation?.visitor?.sessionId || `conv:${conversationId}`;
    const existingName = typeof conversation?.visitor?.name === "string" ? conversation.visitor.name : "";
    const existingEmail = typeof conversation?.visitor?.email === "string" ? conversation.visitor.email : "";

    const resolvedName = (name || existingName || "Anonymous User").trim();
    const resolvedEmail = (email || existingEmail || "").trim().toLowerCase();
    const resolvedPhone = (phone || "").trim();
    const resolvedCompany = (company || "").trim();
    const normalizedTags = (tags || [])
      .map((tag) => String(tag || "").trim())
      .filter(Boolean)
      .slice(0, 20);
    const normalizedTopics = (topics || [])
      .map((topic) => String(topic || "").trim())
      .filter(Boolean)
      .slice(0, 20);
    const resolvedNote = (note || "").trim();
    const resolvedSummary = (summary || "").trim();
    const resolvedTimelineLabel = (timelineLabel || "").trim();
    const resolvedTimelineDetail = (timelineDetail || "").trim();

    const visitorUpdate: Record<string, unknown> = {
      "visitor.name": resolvedName,
      "visitor.isAnonymous": !resolvedName || !resolvedEmail,
      "visitor.providedInfoAt": new Date(),
      "metadata.contactCapturedByAIAt": new Date(),
      "metadata.contactCapturedByAI": true,
      "metadata.senderName": resolvedName,
    };

    if (resolvedEmail) {
      visitorUpdate["visitor.email"] = resolvedEmail;
      visitorUpdate["metadata.senderEmail"] = resolvedEmail;
    }
    if (resolvedPhone) {
      visitorUpdate["metadata.visitorPhone"] = resolvedPhone;
    }

    await ConversationDb.updateOne({ _id: convId }, { $set: visitorUpdate });

    const pushOps: Record<string, unknown> = {};
    if (resolvedNote) {
      pushOps.notes = {
        id: `note-${Date.now()}`,
        author: "AI Assistant",
        content: resolvedNote,
        createdAt: new Date(),
      };
    }
    if (resolvedTimelineLabel) {
      pushOps.timeline = {
        id: `timeline-${Date.now()}`,
        label: resolvedTimelineLabel,
        timestamp: new Date(),
        ...(resolvedTimelineDetail ? { detail: resolvedTimelineDetail } : {}),
      };
    }

    const contact = (await ContactDb.findOneAndUpdate(
      { organizationId: orgId, sessionId },
      {
        $set: {
          organizationId: orgId,
          sessionId,
          conversationId: convId,
          name: resolvedName,
          ...(resolvedEmail ? { email: resolvedEmail } : {}),
          ...(resolvedPhone ? { phone: resolvedPhone } : {}),
          ...(resolvedCompany ? { company: resolvedCompany } : {}),
          ...(status ? { status } : {}),
          ...(sentiment || resolvedSummary || normalizedTopics.length > 0
            ? {
                insights: {
                  summary: resolvedSummary || "No insights yet.",
                  sentiment: sentiment || "neutral",
                  topics: normalizedTopics,
                },
              }
            : {}),
          source: "ai",
          lastActivityAt: new Date(),
          metadata: {
            updatedBy: "ai_tool_direct",
            conversationId,
          },
        },
        ...(normalizedTags.length > 0
          ? {
              $addToSet: {
                tags: { $each: normalizedTags },
              },
            }
          : {}),
        ...(Object.keys(pushOps).length > 0
          ? {
              $push: pushOps,
            }
          : {}),
        $setOnInsert: {
          tags: [],
          notes: [],
          conversations: [],
          timeline: [],
          insights: {
            summary: "No insights yet.",
            sentiment: "neutral",
            topics: [],
          },
        },
      },
      { upsert: true, new: true, runValidators: true },
    ).lean()) as any;

    return {
      status: "success",
      message: "Contact profile updated directly in MongoDB",
      data: {
        id: contact?._id?.toString(),
        sessionId,
        name: contact?.name,
        email: contact?.email,
        phone: contact?.phone,
        conversationId,
      },
    };
  }
}
