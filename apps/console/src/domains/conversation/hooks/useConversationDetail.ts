import { useQuery } from "@tanstack/react-query";
import { conversationsApi } from "../api/conversations.api";

export const useConversationDetail = (conversationId: string) => {
  return useQuery({
    queryKey: ["conversation", conversationId],
    queryFn: () => conversationsApi.getConversationById(conversationId),
    enabled: !!conversationId,
  });
};
