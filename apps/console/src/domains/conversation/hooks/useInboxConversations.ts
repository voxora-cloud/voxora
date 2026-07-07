import { useQuery } from "@tanstack/react-query";
import { conversationsApi } from "../api/conversations.api";

export const useMyConversations = (status?: string) => {
  return useQuery({
    queryKey: ["conversations", "mine", status],
    queryFn: () =>
      conversationsApi.getConversations(status, { assignedToMe: true }),
    select: (res) => res.data?.conversations ?? [],
    refetchOnWindowFocus: true,
  });
};
