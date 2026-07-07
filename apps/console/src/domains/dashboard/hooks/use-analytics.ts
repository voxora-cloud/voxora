import { useQuery } from "@tanstack/react-query";
import { analyticsApi } from "../api/analytics.api";
import { authApi } from "@/domains/auth/api/auth.api";
import type {
  AgentDashboardStats,
  DashboardSummary,
  DashboardTrends,
} from "../types/types";

// Re-export helpers and types for backward compatibility
export type { DashboardSummary, DashboardTrends };
export {
  hasMessageVolumeData,
  hasConversationStatusData,
  hasInteractionSourceData,
} from "../api/analytics.api";

const analyticsQueryOptions = {
  staleTime: 5 * 60 * 1000,      // 5 minutes
  gcTime: 30 * 60 * 1000,        // 30 minutes (garbage collect after)
  refetchOnWindowFocus: false,
  refetchInterval: false as const,
  retry: 1,
};

export function useAnalyticsSummary() {
  const scope = `${authApi.getActiveOrgId() || "unknown"}:${authApi.getOrgRole() || "unknown"}:${authApi.getUser()?.id || "unknown"}`;

  return useQuery<DashboardSummary, Error>({
    queryKey: ["analytics", "summary", scope],
    queryFn: () => analyticsApi.getSummary(),
    ...analyticsQueryOptions,
  });
}

export function useAnalyticsTrends(days = 7) {
  const scope = `${authApi.getActiveOrgId() || "unknown"}:${authApi.getOrgRole() || "unknown"}:${authApi.getUser()?.id || "unknown"}`;

  return useQuery<DashboardTrends, Error>({
    queryKey: ["analytics", "trends", scope, days],
    queryFn: () => analyticsApi.getTrends(days),
    ...analyticsQueryOptions,
  });
}

export function useAgentDashboardStats() {
  const scope = `${authApi.getActiveOrgId() || "unknown"}:${authApi.getUser()?.id || "unknown"}`;

  return useQuery<AgentDashboardStats, Error>({
    queryKey: ["analytics", "agent-dashboard", scope],
    queryFn: () => analyticsApi.getAgentStats(),
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
      refetchType: "active",
    });
  },

  invalidateTrends: async (queryClient: any, days?: number) => {
    if (days) {
      await queryClient.invalidateQueries({
        queryKey: ["analytics", "trends", days],
        refetchType: "active",
      });
    } else {
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
