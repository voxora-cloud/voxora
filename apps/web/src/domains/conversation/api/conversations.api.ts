import { apiClient } from "@/shared/lib/api-client";
import type {
  ConversationDetailResponse,
  ConversationsResponse,
  RouteResponse,
  StatusResponse,
  TeamAgentsResponse,
  TeamsResponse,
  VisitorUpdateResponse,
} from "../types/types";

class ConversationsApi {
  async getConversations(status?: string, options?: { assignedToMe?: boolean; unassigned?: boolean }): Promise<ConversationsResponse> {
    const params = new URLSearchParams();
    if (status && status !== "all") {
      params.set("status", status);
    }
    if (options?.assignedToMe) params.set("assignedToMe", "true");
    if (options?.unassigned) params.set("unassigned", "true");

    const suffix = params.toString();
    return apiClient.get<ConversationsResponse>(
      `/conversations${suffix ? `?${suffix}` : ""}`,
    );
  }

  async getConversationById(conversationId: string): Promise<ConversationDetailResponse> {
    return apiClient.get<ConversationDetailResponse>(`/conversations/${conversationId}`);
  }

  async updateStatus(conversationId: string, status: string): Promise<StatusResponse> {
    return apiClient.patch<StatusResponse>(`/conversations/${conversationId}/status`, {
      status,
    });
  }

  async updateVisitorInfo(
    conversationId: string,
    payload: { name?: string; email?: string; sessionId: string },
  ): Promise<VisitorUpdateResponse> {
    return apiClient.patch<VisitorUpdateResponse>(
      `/conversations/${conversationId}/visitor`,
      payload,
    );
  }

  async routeConversation(
    conversationId: string,
    payload: { teamId?: string; agentId?: string; reason?: string },
  ): Promise<RouteResponse> {
    return apiClient.post<RouteResponse>(
      `/conversations/${conversationId}/route`,
      payload,
    );
  }

  async getTeams(): Promise<TeamsResponse> {
    return apiClient.get<TeamsResponse>("/agent/teams/all");
  }

  async getTeamAgents(teamId: string): Promise<TeamAgentsResponse> {
    return apiClient.get<TeamAgentsResponse>(
      `/agent/teams/${teamId}/all-members`,
    );
  }
}

export const conversationsApi = new ConversationsApi();
