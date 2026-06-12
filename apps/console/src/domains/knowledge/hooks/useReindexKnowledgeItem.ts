import { useMutation, useQueryClient } from "@tanstack/react-query";
import { knowledgeApi } from "../api/knowledge.api";
import type { KnowledgeListResponse } from "../types";

export const useReindexKnowledgeItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["reindex-knowledge"],
    mutationFn: (documentId: string) => knowledgeApi.reindexKnowledgeItem(documentId),
    onMutate: async (documentId: string) => {
      await queryClient.cancelQueries({ queryKey: ["knowledge-items"] });
      const previous = queryClient.getQueryData<KnowledgeListResponse>(["knowledge-items"]);
      queryClient.setQueryData<KnowledgeListResponse>(["knowledge-items"], (prev) => {
        const items = prev?.data.items ?? [];
        return {
          success: prev?.success ?? true,
          data: {
            items: items.map((item) =>
              item._id === documentId ? { ...item, status: "queued" } : item,
            ),
            total: prev?.data.total ?? items.length,
          },
        };
      });
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["knowledge-items"], context.previous);
      }
    },
    onSuccess: (response) => {
      queryClient.setQueryData<KnowledgeListResponse>(["knowledge-items"], (prev) => {
        const items = prev?.data.items ?? [];
        return {
          success: prev?.success ?? true,
          data: {
            items: items.map((item) =>
              item._id === response.data._id ? { ...item, ...response.data } : item,
            ),
            total: prev?.data.total ?? items.length,
          },
        };
      });
    },
  });
};
