import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/shared/lib/api-client";

export interface DashboardSummary {
  totalConversations: number;
  resolvedConversations: number;
  totalUsersServed: number;
  humanEscalationRate: number;
  avgResolutionTimeMs: number | null;
  widgetLoads: number;
  mostAskedQuestions: Array<{ question: string; count: number }>;
  source: {
    widget: number;
    qr: number;
  };
  aiCost: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    estimatedCostUsd: number;
  };
}

export interface DashboardTrends {
  conversationStatus: Array<{
    date: string;
    started: number;
    resolved: number;
    opened: number;
  }>;
  messageVolume: Array<{
    date: string;
    ai: number;
    agent: number;
  }>;
  aiCost: Array<{
    date: string;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    estimatedCostUsd: number;
  }>;
}

export const hasMessageVolumeData = (rows: DashboardTrends["messageVolume"] = []) =>
  rows.some((row) => row.ai > 0 || row.agent > 0);

export const hasConversationStatusData = (rows: DashboardTrends["conversationStatus"] = []) =>
  rows.some((row) => row.started > 0 || row.resolved > 0 || row.opened > 0);

export function useAnalyticsSummary() {
  return useQuery({
    queryKey: ["analytics", "summary"],
    queryFn: async () => {
      const response = await apiClient.get<{ success: boolean; data: DashboardSummary }>("/analytics/owner/summary");
      return response.data;
    },
  });
}

export function useAnalyticsTrends(days = 7) {
  return useQuery({
    queryKey: ["analytics", "trends", days],
    queryFn: async () => {
      const response = await apiClient.get<{ success: boolean; data: DashboardTrends }>(`/analytics/owner/trends?days=${days}`);
      return response.data;
    },
  });
}
