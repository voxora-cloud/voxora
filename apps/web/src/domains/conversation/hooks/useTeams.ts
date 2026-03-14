import { useQuery } from "@tanstack/react-query";
import { conversationsApi } from "../api/conversations.api";

export const useTeams = (enabled = true) => {
  return useQuery({
    queryKey: ["conversationTeams"],
    queryFn: () => conversationsApi.getTeams(),
    select: (response) => response.data || [],
    enabled,
  });
};
