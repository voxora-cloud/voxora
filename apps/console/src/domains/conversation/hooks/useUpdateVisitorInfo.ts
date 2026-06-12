import { useMutation, useQueryClient } from "@tanstack/react-query";
import { conversationsApi } from "../api/conversations.api";

interface UpdateVisitorPayload {
  conversationId: string;
  name?: string;
  email?: string;
  sessionId: string;
}

export const useUpdateVisitorInfo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["updateVisitorInfo"],
    mutationFn: ({ conversationId, name, email, sessionId }: UpdateVisitorPayload) =>
      conversationsApi.updateVisitorInfo(conversationId, { name, email, sessionId }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["conversation", variables.conversationId] });
    },
  });
};
