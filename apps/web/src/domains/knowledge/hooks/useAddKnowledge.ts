import { useMutation, useQueryClient } from "@tanstack/react-query";
import { knowledgeApi } from "../api/knowledge.api";
import { storageApi } from "@/shared/lib/storage.api";
import type { AddKnowledgeFormData, KnowledgeBase } from "../types";

export const useAddKnowledge = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["add-knowledge"],
    mutationFn: async (data: AddKnowledgeFormData) => {
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
    onSuccess: (newItem: KnowledgeBase) => {
      queryClient.setQueryData<KnowledgeBase[]>(["knowledge-items"], (prev = []) => [
        newItem,
        ...prev,
      ]);
    },
  });
};
