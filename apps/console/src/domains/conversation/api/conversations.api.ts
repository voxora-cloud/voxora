import { apiClient } from "@/shared/lib/api-client";
import type {
  ConversationDetailResponse,
  ConversationsResponse,
  RouteResponse,
  StatusResponse,
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


  async routeConversation(
    conversationId: string,
    payload: { agentId?: string; reason?: string },
  ): Promise<RouteResponse> {
    return apiClient.post<RouteResponse>(
      `/conversations/${conversationId}/route`,
      payload,
    );
  }

  async getAgentRuns(conversationId: string): Promise<any> {
    return apiClient.get<any>(`/conversations/${conversationId}/agent-runs`);
  }

  async updateContactAssociation(
    conversationId: string,
    payload: { name?: string; email?: string; phone?: string; company?: string; tags?: string[] },
  ): Promise<any> {
    return apiClient.post<any>(
      `/conversations/${conversationId}/contact`,
      payload,
    );
  }

  async getRecentConversations(): Promise<any> {
    return apiClient.get<any>("/conversations/recents");
  }

  async clearRecentConversations(): Promise<any> {
    return apiClient.delete<any>("/conversations/recents");
  }
}

export const conversationsApi = new ConversationsApi();
