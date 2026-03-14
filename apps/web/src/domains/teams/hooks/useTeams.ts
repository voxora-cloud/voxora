import { useQuery } from "@tanstack/react-query";
import { teamsApi } from "../api/teams.api";

export const useTeams = () => {
  return useQuery({
    queryKey: ["teams"],
    queryFn: () => teamsApi.getTeams(),
    select: (data) => data.data.teams,
  });
};
