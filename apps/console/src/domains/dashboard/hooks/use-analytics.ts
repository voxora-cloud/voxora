import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/shared/lib/api-client";

const analyticsQueryOptions = {
  // Cache strategy:
  // - staleTime: 5 min (browser keeps data fresh, no background refetch)
  // - gcTime (cacheTime): 30 min (keep data in memory for long-lived tabs)
  // - refetchOnWindowFocus: false (don't refetch on tab switch - data is stable enough)
  // - refetchInterval: disabled (manual refresh button preferred for analytics)
  staleTime: 5 * 60 * 1000,      // 5 minutes
  gcTime: 30 * 60 * 1000,        // 30 minutes (garbage collect after)
  refetchOnWindowFocus: false,
  refetchInterval: false as const,
};

export interface DashboardSummary {
  totalMessages: number;
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
    link: number;
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

export const hasInteractionSourceData = (source?: DashboardSummary["source"]) =>
  Boolean(
    (source?.widget || 0) +
    (source?.qr || 0) +
    (source?.link || 0),
  );

export function useAnalyticsSummary() {
  return useQuery<DashboardSummary, Error>({
    queryKey: ["analytics", "summary"],
    queryFn: async () => {
      const response = await apiClient.get<{ success: boolean; data: DashboardSummary }>("/analytics/owner/summary");
      return response.data;
    },
    ...analyticsQueryOptions,
  });
}

export function useAnalyticsTrends(days = 7) {
  return useQuery<DashboardTrends, Error>({
    queryKey: ["analytics", "trends", days],
    queryFn: async () => {
      const response = await apiClient.get<{ success: boolean; data: DashboardTrends }>(`/analytics/owner/trends?days=${days}`);
      return response.data;
    },
    ...analyticsQueryOptions,
  });
}

/**
 * Utility functions for cache invalidation
 * Call these when data changes to sync frontend with backend
 */
export const analyticsCache = {
  invalidateSummary: async (queryClient: any) => {
    await queryClient.invalidateQueries({
      queryKey: ["analytics", "summary"],
      refetchType: "active", // Only refetch if query is currently active
    });
  },

  invalidateTrends: async (queryClient: any, days?: number) => {
    if (days) {
      // Invalidate specific day range
      await queryClient.invalidateQueries({
        queryKey: ["analytics", "trends", days],
        refetchType: "active",
      });
    } else {
      // Invalidate all trend queries
      await queryClient.invalidateQueries({
        queryKey: ["analytics", "trends"],
        refetchType: "active",
      });
    }
  },

  invalidateAll: async (queryClient: any) => {
    await queryClient.invalidateQueries({
      queryKey: ["analytics"],
      refetchType: "active",
    });
  },
};
