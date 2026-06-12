import { useQuery } from "@tanstack/react-query";
import { knowledgeApi } from "../api/knowledge.api";

export const useKnowledgeViewUrl = (documentId: string, enabled = true) => {
  return useQuery({
    queryKey: ["knowledge-view-url", documentId],
    queryFn: () => knowledgeApi.getKnowledgeViewUrl(documentId),
    select: (response) => response.data.url,
    enabled: !!documentId && enabled,
  });
};
