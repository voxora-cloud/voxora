import { useQuery } from "@tanstack/react-query";
import { agentsApi } from "../api/agents.api";

export const useAgents = () => {
  return useQuery({
    queryKey: ["agents"],
    queryFn: () => agentsApi.getAgents(),
    select: (data) => data.data.agents,
  });
};
