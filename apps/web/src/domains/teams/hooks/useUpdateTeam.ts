import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { teamsApi } from "../api/teams.api";
import type { Team, UpdateTeamData } from "../types/types";

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

export const useUpdateTeam = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["updateTeam"],
    mutationFn: async ({ teamId, data }: { teamId: string; data: UpdateTeamData }) => {
      // Artificial delay to visualize optimistic updates
      await new Promise((resolve) => setTimeout(resolve, 1500));
      return teamsApi.updateTeam(teamId, data);
    },
    onMutate: async ({ teamId, data }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["teams"] });

      // Snapshot previous value
      const previousData = queryClient.getQueryData<TeamsResponse>(["teams"]);

      // Optimistically update
      if (previousData?.data?.teams) {
        const updatedTeams = previousData.data.teams.map((team) =>
          team._id === teamId ? { ...team, ...data } : team
        );
        queryClient.setQueryData<TeamsResponse>(["teams"], {
          ...previousData,
          data: {
            ...previousData.data,
            teams: updatedTeams,
          },
        });
      }

      return { previousData };
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(["teams"], context.previousData);
      }
      toast.error("Failed to update team");
    },
    onSuccess: () => {
      toast.success("Team updated successfully");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
    },
  });
};
