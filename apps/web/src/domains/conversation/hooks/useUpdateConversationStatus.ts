import { useMutation, useQueryClient } from "@tanstack/react-query";
import { conversationsApi } from "../api/conversations.api";

export const useUpdateConversationStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["updateConversationStatus"],
    mutationFn: ({ conversationId, status }: { conversationId: string; status: string }) =>
      conversationsApi.updateStatus(conversationId, status),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["conversation", variables.conversationId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
};
