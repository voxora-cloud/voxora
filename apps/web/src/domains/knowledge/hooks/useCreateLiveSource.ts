import { useMutation, useQueryClient } from "@tanstack/react-query";
import { knowledgeApi } from "../api/knowledge.api";
import type { AddLiveSourceFormData, KnowledgeBase } from "../types";

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
      queryClient.setQueryData<KnowledgeBase[]>(["knowledge-items"], (prev = []) => [
        newItem,
        ...prev,
      ]);
    },
  });
};
