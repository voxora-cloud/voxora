import { useQuery } from "@tanstack/react-query";
import { analyticsApi } from "../api/analytics.api";
import type { DashboardSummary, DashboardTrends } from "../types/types";

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
};

export function useAnalyticsSummary() {
  return useQuery<DashboardSummary, Error>({
    queryKey: ["analytics", "summary"],
    queryFn: () => analyticsApi.getSummary(),
    ...analyticsQueryOptions,
  });
}

export function useAnalyticsTrends(days = 7) {
  return useQuery<DashboardTrends, Error>({
    queryKey: ["analytics", "trends", days],
    queryFn: () => analyticsApi.getTrends(days),
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
