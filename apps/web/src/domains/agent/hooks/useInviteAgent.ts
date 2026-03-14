import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { agentsApi } from "../api/agents.api";
import type { Agent, InviteAgentData } from "../types/types";

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

export const useInviteAgent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["inviteAgent"],
    mutationFn: async (data: InviteAgentData) => {
      // Artificial delay to visualize loading state
      await new Promise((resolve) => setTimeout(resolve, 1500));
      return agentsApi.inviteAgent(data);
    },
    onMutate: async (newAgent) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["agents"] });

      // Snapshot previous value
      const previousData = queryClient.getQueryData<AgentsResponse>(["agents"]);

      // Optimistically add new agent
      if (previousData?.data?.agents) {
        const optimisticAgent: Agent = {
          _id: `temp-${Date.now()}`,
          user: {
            _id: `temp-user-${Date.now()}`,
            name: newAgent.name,
            email: newAgent.email,
          },
          role: "agent",
          teams: [],
          status: "offline",
          lastSeen: new Date(),
          inviteStatus: "pending",
          createdAt: new Date(),
        };

        queryClient.setQueryData<AgentsResponse>(["agents"], {
          ...previousData,
          data: {
            ...previousData.data,
            agents: [optimisticAgent, ...previousData.data.agents],
          },
        });
      }

      return { previousData };
    },
    onError: (_error, _variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(["agents"], context.previousData);
      }
      toast.error("Failed to invite agent");
    },
    onSuccess: (response) => {
      toast.success("Agent invited successfully", {
        description: `An invitation has been sent to ${response.data.user.email}`,
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
    },
  });
};
