import { useMutation, useQueryClient } from "@tanstack/react-query";
import { knowledgeApi } from "../api/knowledge.api";
import type { KnowledgeListResponse } from "../types";

export const useDeleteKnowledgeItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["delete-knowledge"],
    mutationFn: (documentId: string) => knowledgeApi.deleteKnowledgeItem(documentId),
    onSuccess: (_data, documentId) => {
      queryClient.setQueryData<KnowledgeListResponse>(["knowledge-items"], (prev) => {
        const items = prev?.data.items ?? [];
        const filtered = items.filter((item) => item._id !== documentId);
        const total = prev?.data.total ?? items.length;

        return {
          success: prev?.success ?? true,
          data: {
            items: filtered,
            total: Math.max(0, total - 1),
          },
        };
      });
    },
  });
};
