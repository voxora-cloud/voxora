import { useMutation, useQueryClient } from "@tanstack/react-query";
import { knowledgeApi } from "../api/knowledge.api";
import { storageApi } from "@/shared/lib/storage.api";
import type { AddKnowledgeFormData, KnowledgeBase, KnowledgeListResponse } from "../types";

export const useAddKnowledge = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["add-knowledge"],
    mutationFn: async (data: AddKnowledgeFormData) => {
      if (data.source === "faq") {
        const faqEntries =
          data.faqEntries?.filter(
            (entry) => entry.question.trim() && entry.answer.trim(),
          ) ?? [];

        const createdItems = await Promise.all(
          faqEntries.map(async (entry) => {
            const { data: created } = await knowledgeApi.createTextKnowledge({
              title: entry.question.trim(),
              description: data.description,
              catalog: data.catalog,
              source: "faq",
              content: entry.answer.trim(),
            });

            return created;
          }),
        );

        return createdItems;
      }

      if ((data.source === "pdf" || data.source === "docx") && data.file) {
        const { data: uploadMeta } = await knowledgeApi.requestKnowledgeUpload({
          title: data.title,
          description: data.description,
          catalog: data.catalog,
          source: data.source,
          fileName: data.file.name,
          fileSize: data.file.size,
          mimeType: data.file.type,
        });

        await storageApi.uploadFileWithPresignedUrl(
          uploadMeta.presignedUrl,
          data.file,
        );

        const { data: confirmed } = await knowledgeApi.confirmKnowledgeUpload(
          uploadMeta.documentId,
        );
        return confirmed;
      }

      const { data: created } = await knowledgeApi.createTextKnowledge({
        title: data.title,
        description: data.description,
        catalog: data.catalog,
        source: "text",
        content: data.content,
      });

      return created;
    },
    onSuccess: (newItem: KnowledgeBase | KnowledgeBase[]) => {
      queryClient.setQueryData<KnowledgeListResponse>(["knowledge-items"], (prev) => {
        const newItems = Array.isArray(newItem) ? newItem : [newItem];
        const items = prev?.data.items ?? [];
        const total = prev?.data.total ?? items.length;

        return {
          success: prev?.success ?? true,
          data: {
            items: [...newItems, ...items],
            total: total + newItems.length,
          },
        };
      });
    },
  });
};
