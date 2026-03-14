import { apiClient } from "@/shared/lib/api-client";
import type { InviteAgentData, UpdateAgentData } from "../types/types";
import type { AgentResponse, AgentsResponse, DeleteResponse, InviteResponse, ResendInviteResponse } from "../types/types";

class AgentsApi {
  async getAgents(): Promise<AgentsResponse> {
    return apiClient.get<AgentsResponse>("/admin/agents");
  }

  async inviteAgent(data: InviteAgentData): Promise<InviteResponse> {
    return apiClient.post<InviteResponse>("/admin/invite-agent", data);
  }

  async updateAgent(agentId: string, data: UpdateAgentData): Promise<AgentResponse> {
    return apiClient.put<AgentResponse>(`/admin/agents/${agentId}`, data);
  }

  async deleteAgent(agentId: string): Promise<DeleteResponse> {
    return apiClient.delete<DeleteResponse>(`/admin/agents/${agentId}`);
  }

  async getAgentById(agentId: string): Promise<AgentResponse> {
    return apiClient.get<AgentResponse>(`/admin/agents/${agentId}`);
  }

  async resendInvite(agentId: string): Promise<ResendInviteResponse> {
    return apiClient.post<ResendInviteResponse>(`/admin/agents/${agentId}/resend-invite`);
  }

  async activateAgent(agentId: string): Promise<AgentResponse> {
    return apiClient.post<AgentResponse>(`/admin/agents/${agentId}/activate`);
  }

  async deactivateAgent(agentId: string): Promise<AgentResponse> {
    return apiClient.post<AgentResponse>(`/admin/agents/${agentId}/deactivate`);
  }
}

export const agentsApi = new AgentsApi();
