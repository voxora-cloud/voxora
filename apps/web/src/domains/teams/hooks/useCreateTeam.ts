import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { teamsApi } from "../api/teams.api";
import type { CreateTeamData, Team } from "../types/types";

interface TeamsResponse {
  success: boolean;
  data: {
    teams: Team[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
      itemsPerPage: number;
    };
  };
}

export const useCreateTeam = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["createTeam"],
    mutationFn: async (data: CreateTeamData) => {
      // Artificial delay to visualize loading state
      await new Promise((resolve) => setTimeout(resolve, 1500));
      return teamsApi.createTeam(data);
    },
    onMutate: async (newTeam) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["teams"] });

      // Snapshot previous value
      const previousData = queryClient.getQueryData<TeamsResponse>(["teams"]);

      // Optimistically add new team
      if (previousData?.data?.teams) {
        const optimisticTeam: Team = {
          _id: `temp-${Date.now()}`,
          name: newTeam.name,
          description: newTeam.description,
          color: newTeam.color || "#10b981",
          agentCount: 0,
          onlineAgents: 0,
          createdAt: new Date().toISOString(),
        };

        queryClient.setQueryData<TeamsResponse>(["teams"], {
          ...previousData,
          data: {
            ...previousData.data,
            teams: [optimisticTeam, ...previousData.data.teams],
          },
        });
      }

      return { previousData };
    },
    onError: (_error, _variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(["teams"], context.previousData);
      }
      toast.error("An error occurred while creating the team");
    },
    onSuccess: (_data, variables) => {
      toast.success(`Team "${variables.name}" created successfully`);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
    },
  });
};
