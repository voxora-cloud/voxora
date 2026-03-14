import { useMutation, useQueryClient } from "@tanstack/react-query";
import { knowledgeApi } from "../api/knowledge.api";
import type { KnowledgeBase } from "../types";

export const useReindexKnowledgeItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["reindex-knowledge"],
    mutationFn: (documentId: string) => knowledgeApi.reindexKnowledgeItem(documentId),
    onMutate: async (documentId: string) => {
      await queryClient.cancelQueries({ queryKey: ["knowledge-items"] });
      const previous = queryClient.getQueryData<KnowledgeBase[]>(["knowledge-items"]);
      queryClient.setQueryData<KnowledgeBase[]>(["knowledge-items"], (prev = []) =>
        prev.map((item) =>
          item._id === documentId ? { ...item, status: "queued" } : item,
        ),
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["knowledge-items"], context.previous);
      }
    },
    onSuccess: (response) => {
      queryClient.setQueryData<KnowledgeBase[]>(["knowledge-items"], (prev = []) =>
        prev.map((item) =>
          item._id === response.data._id ? { ...item, ...response.data } : item,
        ),
      );
    },
  });
};
