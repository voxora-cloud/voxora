import { apiClient } from "@/shared/lib/api-client";
import type { CreateWidgetData, UpdateWidgetData, WidgetResponse } from "../types";

export const widgetApi = {
  getWidget: () => apiClient.get<WidgetResponse>("/admin/widget"),

  createWidget: (data: CreateWidgetData) =>
    apiClient.post<WidgetResponse>("/admin/create-widget", data),

  updateWidget: (data: UpdateWidgetData) =>
    apiClient.put<WidgetResponse>("/admin/widget", data),
};
