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

export const useUnassignedConversations = () => {
  return useQuery({
    queryKey: ["conversations", "unassigned"],
    queryFn: () => conversationsApi.getConversations("pending", { unassigned: true }),
    select: (res) => res.data?.conversations ?? [],
    refetchOnWindowFocus: true,
  });
};
