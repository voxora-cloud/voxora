import { Template } from "@shared/models";

export interface TemplatePayload {
  title?: string;
  content?: string;
  shortcut?: string;
  category?: string;
}

function cleanPayload(data: TemplatePayload) {
  return {
    ...(data.title !== undefined && { title: data.title.trim() }),
    ...(data.content !== undefined && { content: data.content.trim() }),
    ...(data.shortcut !== undefined && { shortcut: data.shortcut.trim() }),
    ...(data.category !== undefined && {
      category: data.category.trim() || "General",
    }),
  };
}

export class TemplatesService {
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
