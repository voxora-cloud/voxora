import { useQuery } from "@tanstack/react-query";
import { conversationsApi } from "../api/conversations.api";

export const useTeamAgents = (teamId: string) => {
  return useQuery({
    queryKey: ["conversationTeamAgents", teamId],
    queryFn: () => conversationsApi.getTeamAgents(teamId),
    select: (response) => response.data || [],
    enabled: !!teamId,
  });
};
