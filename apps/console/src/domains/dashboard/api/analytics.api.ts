import { apiClient } from "@/shared/lib/api-client";
import type {
  AgentDashboardStats,
  DashboardSummary,
  DashboardTrends,
} from "../types/types";

export type { DashboardSummary, DashboardTrends };

export const hasMessageVolumeData = (rows: DashboardTrends["messageVolume"] = []) =>
  rows.some((row) => row.ai > 0 || row.agent > 0);

export const hasConversationStatusData = (rows: DashboardTrends["conversationStatus"] = []) =>
  rows.some((row) => row.started > 0 || row.resolved > 0 || row.opened > 0);

export const hasInteractionSourceData = (source?: DashboardSummary["source"]) =>
  Boolean(
    (source?.widget || 0) +
    (source?.qr || 0) +
    (source?.link || 0) +
    (source?.email || 0) +
    (source?.whatsapp || 0) +
    (source?.telegram || 0) +
    (source?.web || 0),
  );

class AnalyticsApi {
  async getSummary(): Promise<DashboardSummary> {
    const response = await apiClient.get<{ success: boolean; data: DashboardSummary }>("/analytics/summary");
    return response.data;
  }

  async getTrends(days: number): Promise<DashboardTrends> {
    const response = await apiClient.get<{ success: boolean; data: DashboardTrends }>(`/analytics/trends?days=${days}`);
    return response.data;
  }

  async getAgentStats(): Promise<AgentDashboardStats> {
    const response = await apiClient.get<{
      success: boolean;
      data: AgentDashboardStats;
    }>("/agent/stats");
    return response.data;
  }
}

export const analyticsApi = new AnalyticsApi();
