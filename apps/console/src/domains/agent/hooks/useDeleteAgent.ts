import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { agentsApi } from "../api/agents.api";
import type { Agent } from "../types/types";

interface AgentsResponse {
  success: boolean;
  data: {
    agents: Agent[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
      itemsPerPage: number;
    };
  };
}

export const useDeleteAgent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["deleteAgent"],
    mutationFn: async (agentId: string) => {
      // Artificial delay to visualize optimistic updates
      await new Promise((resolve) => setTimeout(resolve, 1500));
      return agentsApi.deleteAgent(agentId);
    },
    onMutate: async (agentId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["agents"] });

      // Snapshot previous value
      const previousData = queryClient.getQueryData<AgentsResponse>(["agents"]);

      // Optimistically remove
      if (previousData?.data?.agents) {
        const updatedAgents = previousData.data.agents.filter(
          (agent) => agent._id !== agentId && agent.user?._id !== agentId
        );
        queryClient.setQueryData<AgentsResponse>(["agents"], {
          ...previousData,
          data: {
            ...previousData.data,
            agents: updatedAgents,
          },
        });
      }

      return { previousData };
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(["agents"], context.previousData);
      }
      toast.error("Failed to delete agent");
    },
    onSuccess: () => {
      toast.success("Agent deleted successfully");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
    },
  });
};
