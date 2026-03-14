import { apiClient } from "@/shared/lib/api-client";
import { authApi } from "@/domains/auth/api/auth.api";
import type {
  MembersResponse,
  InviteMemberData,
  OrgRole,
} from "../types/types";

class MembersApi {
  private getOrgId(): string {
    const orgId = authApi.getActiveOrgId();
    if (!orgId) throw new Error("No active organization found");
    return orgId;
  }

  async listMembers(): Promise<MembersResponse> {
    const orgId = this.getOrgId();
    return apiClient.get<MembersResponse>(`/memberships/organizations/${orgId}/members`);
  }

  async inviteMember(data: InviteMemberData): Promise<{ success: boolean }> {
    const orgId = this.getOrgId();
    return apiClient.post<{ success: boolean }>(
      `/memberships/organizations/${orgId}/members/invite`,
      data
    );
  }

  async resendMemberInvite(memberId: string): Promise<{ success: boolean }> {
    const orgId = this.getOrgId();
    return apiClient.post<{ success: boolean }>(
      `/memberships/organizations/${orgId}/members/${memberId}/resend-invite`
    );
  }

  async updateMemberRole(
    memberId: string,
    role: OrgRole
  ): Promise<{ success: boolean }> {
    const orgId = this.getOrgId();
    return apiClient.patch<{ success: boolean }>(
      `/memberships/organizations/${orgId}/members/${memberId}/role`,
      { role }
    );
  }

  async updateMemberStatus(
    memberId: string,
    status: "active" | "inactive"
  ): Promise<{ success: boolean }> {
    const orgId = this.getOrgId();
    return apiClient.patch<{ success: boolean }>(
      `/memberships/organizations/${orgId}/members/${memberId}/status`,
      { status }
    );
  }

  async removeMember(memberId: string): Promise<{ success: boolean }> {
    const orgId = this.getOrgId();
    return apiClient.delete<{ success: boolean }>(
      `/memberships/organizations/${orgId}/members/${memberId}`
    );
  }
}

export const membersApi = new MembersApi();
