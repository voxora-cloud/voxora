import { apiClient } from "@/shared/lib/api-client";
import { authApi } from "@/domains/auth/api/auth.api";
import type { InviteAgentData, UpdateAgentData } from "../types/types";
import type { AgentResponse, AgentsResponse, DeleteResponse, InviteResponse, ResendInviteResponse } from "../types/types";

class AgentsApi {
  private getOrgId(): string {
    const orgId = authApi.getActiveOrgId();
    if (!orgId) throw new Error("No active organization found");
    return orgId;
  }

  async getAgents(): Promise<AgentsResponse> {
    const orgId = this.getOrgId();
    return apiClient.get<AgentsResponse>(`/memberships/organizations/${orgId}/members`);
  }

  async inviteAgent(data: InviteAgentData): Promise<InviteResponse> {
    const orgId = this.getOrgId();
    return apiClient.post<InviteResponse>(`/memberships/organizations/${orgId}/members/invite`, data);
  }

  async updateAgent(agentId: string, data: UpdateAgentData): Promise<AgentResponse> {
    const orgId = this.getOrgId();
    return apiClient.patch<AgentResponse>(`/memberships/organizations/${orgId}/members/${agentId}/role`, { role: data.role });
  }

  async deleteAgent(agentId: string): Promise<DeleteResponse> {
    const orgId = this.getOrgId();
    return apiClient.delete<DeleteResponse>(`/memberships/organizations/${orgId}/members/${agentId}`);
  }

  async getAgentById(agentId: string): Promise<AgentResponse> {
    const orgId = this.getOrgId();
    return apiClient.get<AgentResponse>(`/memberships/organizations/${orgId}/members/${agentId}`);
  }

  async resendInvite(agentId: string): Promise<ResendInviteResponse> {
    const orgId = this.getOrgId();
    return apiClient.post<ResendInviteResponse>(`/memberships/organizations/${orgId}/members/${agentId}/resend-invite`);
  }

  async activateAgent(agentId: string): Promise<AgentResponse> {
    const orgId = this.getOrgId();
    return apiClient.patch<AgentResponse>(`/memberships/organizations/${orgId}/members/${agentId}/status`, { status: "active" });
  }

  async deactivateAgent(agentId: string): Promise<AgentResponse> {
    const orgId = this.getOrgId();
    return apiClient.patch<AgentResponse>(`/memberships/organizations/${orgId}/members/${agentId}/status`, { status: "inactive" });
  }
}

export const agentsApi = new AgentsApi();
