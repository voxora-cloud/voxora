import { apiClient } from "@/shared/lib/api-client";
import type { CreateWidgetData, UpdateWidgetData, WidgetResponse } from "../types";

export const widgetApi = {
  getWidget: () => apiClient.get<WidgetResponse>("/widget/manage"),

  createWidget: (data: CreateWidgetData) =>
    apiClient.post<WidgetResponse>("/widget/manage", data),

  updateWidget: (data: UpdateWidgetData) =>
    apiClient.put<WidgetResponse>("/widget/manage", data),
};
