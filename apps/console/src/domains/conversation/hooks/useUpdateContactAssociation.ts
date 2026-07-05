import { useMutation, useQueryClient } from "@tanstack/react-query";
import { conversationsApi } from "../api/conversations.api";

export const useUpdateContactAssociation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      conversationId,
      name,
      email,
      phone,
      company,
      tags,
    }: {
      conversationId: string;
      name?: string;
      email?: string;
      phone?: string;
      company?: string;
      tags?: string[];
    }) =>
      conversationsApi.updateContactAssociation(conversationId, {
        name,
        email,
        phone,
        company,
        tags,
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["conversation", variables.conversationId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
};
