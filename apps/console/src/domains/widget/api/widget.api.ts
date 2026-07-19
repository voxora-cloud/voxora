import { apiClient } from "@/shared/lib/api-client";
import type {
  CreateWidgetData,
  UpdateWidgetData,
  WidgetDomainResponse,
  WidgetDomainsResponse,
  WidgetResponse,
} from "../types/types";

export const widgetApi = {
  getWidget: () => apiClient.get<WidgetResponse>("/widget/manage"),

  createWidget: (data: CreateWidgetData) =>
    apiClient.post<WidgetResponse>("/widget/manage", data),

  updateWidget: (data: UpdateWidgetData) =>
    apiClient.put<WidgetResponse>("/widget/manage", data),

  verifyDomain: () => apiClient.post<any>("/widget/verify-domain"),

  getDomains: () => apiClient.get<WidgetDomainsResponse>("/widget/domains"),

  addDomain: (data: { domain: string; includeSubdomains: boolean }) =>
    apiClient.post<WidgetDomainResponse>("/widget/domains", data),

  updateDomain: (
    domainId: string,
    data: { domain?: string; includeSubdomains?: boolean },
  ) =>
    apiClient.patch<WidgetDomainResponse>(`/widget/domains/${domainId}`, data),

  removeDomain: (domainId: string) =>
    apiClient.delete<WidgetDomainsResponse>(`/widget/domains/${domainId}`),

  verifyDomainById: (domainId: string) =>
    apiClient.post<{
      success: boolean;
      data: {
        domainVerificationStatus: "verified";
        verifiedDomain: string;
      };
    }>(`/widget/domains/${domainId}/verify`),
};
