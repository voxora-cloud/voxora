import { apiClient } from "@/shared/lib/api-client";
import type { DeleteOrganizationResponse, OrganizationResponse } from "../types/type";

export interface UpdateOrganizationPayload {
  name?: string;
  slug?: string;
  logoUrl?: string;
  emailSender?: {
    fromEmail?: string;
    fromName?: string;
    domain?: string;
    verified?: boolean;
  };
}

export const settingsApi = {
  getOrganization: (orgId: string) =>
    apiClient.get<OrganizationResponse>(`/organizations/${orgId}`),

  updateOrganization: (
    orgId: string,
    data: UpdateOrganizationPayload,
  ) => apiClient.patch<OrganizationResponse>(`/organizations/${orgId}`, data),

  deleteOrganization: (orgId: string) =>
    apiClient.delete<DeleteOrganizationResponse>(`/organizations/${orgId}`),
};