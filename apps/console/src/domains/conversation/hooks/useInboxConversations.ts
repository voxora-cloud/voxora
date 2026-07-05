import { useQuery } from "@tanstack/react-query";
import { conversationsApi } from "../api/conversations.api";

export const useMyConversations = () => {
  return useQuery({
    queryKey: ["conversations", "mine"],
    queryFn: () => conversationsApi.getConversations(undefined, { assignedToMe: true }),
    select: (res) => res.data?.conversations ?? [],
    refetchOnWindowFocus: true,
  });
};


