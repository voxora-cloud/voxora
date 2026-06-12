import type { Organization } from "@/shared/types/types";

export interface OrganizationResponse {
  success: boolean;
  data: {
    organization: Organization;
  };
}

export interface DeleteOrganizationResponse {
  success: boolean;
}
