import { apiClient } from "@/shared/lib/api-client";
import type { DeleteOrganizationResponse, OrganizationResponse } from "../types/type";

export const settingsApi = {
  getOrganization: (orgId: string) =>
    apiClient.get<OrganizationResponse>(`/organizations/${orgId}`),

  updateOrganization: (
    orgId: string,
    data: { name?: string; slug?: string; logoUrl?: string },
  ) => apiClient.patch<OrganizationResponse>(`/organizations/${orgId}`, data),

  deleteOrganization: (orgId: string) =>
    apiClient.delete<DeleteOrganizationResponse>(`/organizations/${orgId}`),
};