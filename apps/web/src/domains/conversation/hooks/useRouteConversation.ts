import { useMutation, useQueryClient } from "@tanstack/react-query";
import { conversationsApi } from "../api/conversations.api";

interface RouteConversationPayload {
  conversationId: string;
  teamId?: string;
  agentId?: string;
  reason?: string;
}

export const useRouteConversation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["routeConversation"],
    mutationFn: ({ conversationId, teamId, agentId, reason }: RouteConversationPayload) =>
      conversationsApi.routeConversation(conversationId, { teamId, agentId, reason }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["conversation", variables.conversationId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
};
