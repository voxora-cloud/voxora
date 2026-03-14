import { useMutation, useQueryClient } from "@tanstack/react-query";
import { knowledgeApi } from "../api/knowledge.api";
import type { KnowledgeBase, KnowledgeUpdatePayload } from "../types";

interface UpdatePayload {
  documentId: string;
  payload: KnowledgeUpdatePayload;
}

export const useUpdateKnowledgeItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["update-knowledge"],
    mutationFn: ({ documentId, payload }: UpdatePayload) =>
      knowledgeApi.updateKnowledgeItem(documentId, payload),
    onSuccess: (response) => {
      queryClient.setQueryData<KnowledgeBase[]>(["knowledge-items"], (prev = []) =>
        prev.map((item) =>
          item._id === response.data._id ? { ...item, ...response.data } : item,
        ),
      );
    },
  });
};
