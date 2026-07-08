import { apiClient } from "@/shared/lib/api-client";
import type { Template, TemplateInput } from "../types/types";

class TemplatesApi {
  async getTemplates(): Promise<Template[]> {
    const response = await apiClient.get<{
      success: boolean;
      data: Template[];
    }>("/templates");
    return response.data || [];
  }

  async createTemplate(data: TemplateInput): Promise<Template> {
    const response = await apiClient.post<{
      success: boolean;
      data: Template;
    }>("/templates", data);
    return response.data;
  }

  async updateTemplate(
    id: string,
    data: Partial<TemplateInput>,
  ): Promise<Template> {
    const response = await apiClient.patch<{
      success: boolean;
      data: Template;
    }>(`/templates/${id}`, data);
    return response.data;
  }

  async deleteTemplate(id: string): Promise<void> {
    await apiClient.delete(`/templates/${id}`);
  }
}

export const templatesApi = new TemplatesApi();
