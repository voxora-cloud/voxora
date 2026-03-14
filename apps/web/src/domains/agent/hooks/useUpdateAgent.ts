import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { agentsApi } from "../api/agents.api";
import type { Agent, UpdateAgentData } from "../types/types";

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

export const useUpdateAgent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["updateAgent"],
    mutationFn: async ({ agentId, data }: { agentId: string; data: UpdateAgentData }) => {
      // Artificial delay to visualize optimistic updates
      await new Promise((resolve) => setTimeout(resolve, 1500));
      return agentsApi.updateAgent(agentId, data);
    },
    onMutate: async ({ agentId, data }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["agents"] });

      // Snapshot previous value
      const previousData = queryClient.getQueryData<AgentsResponse>(["agents"]);

      // Optimistically update
      if (previousData?.data?.agents) {
        const updatedAgents = previousData.data.agents.map((agent) =>
          agent._id === agentId || agent.user?._id === agentId
            ? {
                ...agent,
                user: data.name ? { ...agent.user, name: data.name } : agent.user,
                teams: data.teamIds
                  ? ([] as { _id: string; name: string; color: string }[]) // Will be populated by real response
                  : agent.teams,
              }
            : agent
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
      toast.error("Failed to update agent");
    },
    onSuccess: () => {
      toast.success("Agent updated successfully");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
    },
  });
};
