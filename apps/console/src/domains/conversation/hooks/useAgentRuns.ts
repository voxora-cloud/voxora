import { useQuery } from "@tanstack/react-query";
import { conversationsApi } from "../api/conversations.api";

export const useAgentRuns = (conversationId: string) => {
  return useQuery({
    queryKey: ["agent-runs", conversationId],
    queryFn: () => conversationsApi.getAgentRuns(conversationId),
    enabled: !!conversationId,
  });
};
