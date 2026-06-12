import { useQuery } from "@tanstack/react-query";
import { conversationsApi } from "../api/conversations.api";
export const useConversations = (status: string) => {
  return useQuery({
    queryKey: ["conversations", status],
    queryFn: () => conversationsApi.getConversations(status),
    select: (response) => response.data.conversations || [],
  });
};
