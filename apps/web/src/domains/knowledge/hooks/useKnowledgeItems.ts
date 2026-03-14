import { useQuery } from "@tanstack/react-query";
import { knowledgeApi } from "../api/knowledge.api";

export const useKnowledgeItems = () => {
  return useQuery({
    queryKey: ["knowledge-items"],
    queryFn: () => knowledgeApi.getKnowledgeItems(),
    select: (response) => response.data.items || [],
  });
};
