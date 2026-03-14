import { useMutation, useQueryClient } from "@tanstack/react-query";
import { knowledgeApi } from "../api/knowledge.api";
import type { KnowledgeBase } from "../types";

export const useDeleteKnowledgeItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["delete-knowledge"],
    mutationFn: (documentId: string) => knowledgeApi.deleteKnowledgeItem(documentId),
    onSuccess: (_data, documentId) => {
      queryClient.setQueryData<KnowledgeBase[]>(["knowledge-items"], (prev = []) =>
        prev.filter((item) => item._id !== documentId),
      );
    },
  });
};
