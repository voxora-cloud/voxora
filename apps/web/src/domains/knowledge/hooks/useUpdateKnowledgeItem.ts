import { useMutation, useQueryClient } from "@tanstack/react-query";
import { knowledgeApi } from "../api/knowledge.api";
import type { KnowledgeListResponse, KnowledgeUpdatePayload } from "../types";

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
