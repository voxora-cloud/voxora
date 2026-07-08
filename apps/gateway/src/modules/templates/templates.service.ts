import { Template } from "@shared/models";
import { ClientSession, Types } from "mongoose";

export interface TemplatePayload {
  title?: string;
  content?: string;
  shortcut?: string;
  category?: string;
}

const DEFAULT_SUGGESTION_TEMPLATES = [
  {
    title: "Welcome message",
    content:
      "Hi there, thanks for reaching out. I'm happy to help you with this.",
    shortcut: "welcome",
    category: "Greeting",
  },
  {
    title: "Ask for more details",
    content:
      "Could you share a few more details so we can understand the issue better?",
    shortcut: "details",
    category: "Support",
  },
  {
    title: "Request received",
    content: "Thanks, we've received your request and will review it shortly.",
    shortcut: "received",
    category: "Support",
  },
  {
    title: "We are checking this",
    content:
      "We're checking this now and will update you as soon as we have more information.",
    shortcut: "checking",
    category: "Support",
  },
  {
    title: "Issue resolved",
    content:
      "This issue has been resolved. Please let us know if you still need help.",
    shortcut: "resolved",
    category: "Closing",
  },
  {
    title: "Follow-up message",
    content:
      "Just following up to see if you still need help with this request.",
    shortcut: "followup",
    category: "Follow-up",
  },
  {
    title: "Thank you closing",
    content:
      "Thanks for contacting us. We're glad we could help, and we're here if you need anything else.",
    shortcut: "thanks",
    category: "Closing",
  },
];

function cleanPayload(data: TemplatePayload) {
  return {
    ...(data.title !== undefined && { title: data.title.trim() }),
    ...(data.content !== undefined && { content: data.content.trim() }),
    ...(data.shortcut !== undefined && {
      shortcut: data.shortcut.trim().replace(/^\/+/, ""),
    }),
    ...(data.category !== undefined && {
      category: data.category.trim() || "General",
    }),
  };
}

export class TemplatesService {
  static async seedDefaultTemplates(
    organizationId: string,
    userId: string,
    options?: { session?: ClientSession },
  ) {
    const organizationObjectId = new Types.ObjectId(organizationId);
    const userObjectId = new Types.ObjectId(userId);
    const operations = DEFAULT_SUGGESTION_TEMPLATES.map((template) => ({
      updateOne: {
        filter: {
          organizationId: organizationObjectId,
          title: template.title,
        },
        update: {
          $setOnInsert: {
            organizationId: organizationObjectId,
            createdBy: userObjectId,
            ...template,
          },
        },
        upsert: true,
      },
    }));

    if (operations.length === 0) return;
    await Template.bulkWrite(operations, {
      ordered: false,
      session: options?.session,
    });
  }

  async listTemplates(organizationId: string) {
    return Template.find({ organizationId })
      .sort({ category: 1, title: 1 })
      .lean();
  }

  async createTemplate(
    organizationId: string,
    userId: string,
    data: TemplatePayload,
  ) {
    const payload = cleanPayload(data);
    return Template.create({
      organizationId,
      createdBy: userId,
      category: "General",
      shortcut: "",
      ...payload,
    });
  }

  async updateTemplate(
    organizationId: string,
    id: string,
    data: TemplatePayload,
  ) {
    return Template.findOneAndUpdate(
      { _id: id, organizationId },
      { $set: cleanPayload(data) },
      { new: true },
    ).lean();
  }

  async deleteTemplate(organizationId: string, id: string) {
    return Template.findOneAndDelete({ _id: id, organizationId }).lean();
  }
}
