import { useMutation, useQueryClient } from "@tanstack/react-query";
import { knowledgeApi } from "../api/knowledge.api";
import type { AddLiveSourceFormData, KnowledgeBase, KnowledgeListResponse } from "../types";

export const useCreateLiveSource = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["add-live-source"],
    mutationFn: async (data: AddLiveSourceFormData) => {
      const { data: created } = await knowledgeApi.createTextKnowledge({
        title: data.url,
        source: "url",
        url: data.url,
        catalog: "realtime",
        fetchMode: data.fetchMode,
        crawlDepth: data.crawlDepth,
        syncFrequency: data.syncFrequency,
      });

      return created;
    },
    onSuccess: (newItem: KnowledgeBase) => {
      queryClient.setQueryData<KnowledgeListResponse>(["knowledge-items"], (prev) => {
        const items = prev?.data.items ?? [];
        const total = prev?.data.total ?? items.length;

        return {
          success: prev?.success ?? true,
          data: {
            items: [newItem, ...items],
            total: total + 1,
          },
        };
      });
    },
  });
};
