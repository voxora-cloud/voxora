import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { teamsApi } from "../api/teams.api";
import type { Team } from "../types/types";

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

export const useDeleteTeam = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["deleteTeam"],
    mutationFn: async (teamId: string) => {
      // Artificial delay to visualize optimistic updates
      await new Promise((resolve) => setTimeout(resolve, 1500));
      return teamsApi.deleteTeam(teamId);
    },
    onMutate: async (teamId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["teams"] });

      // Snapshot previous value
      const previousData = queryClient.getQueryData<TeamsResponse>(["teams"]);

      let deletedTeamName: string | undefined;

      // Optimistically remove
      if (previousData?.data?.teams) {
        const deletedTeam = previousData.data.teams.find(
          (team) => team._id === teamId
        );
        deletedTeamName = deletedTeam?.name;
        const updatedTeams = previousData.data.teams.filter(
          (team) => team._id !== teamId
        );
        queryClient.setQueryData<TeamsResponse>(["teams"], {
          ...previousData,
          data: {
            ...previousData.data,
            teams: updatedTeams,
          },
        });
      }

      return { previousData, deletedTeamName };
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(["teams"], context.previousData);
      }
      toast.error("Failed to delete team");
    },
    onSuccess: (_data, _variables, context) => {
      toast.success(
        context?.deletedTeamName
          ? `Team "${context.deletedTeamName}" deleted successfully`
          : "Team deleted successfully"
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
    },
  });
};
