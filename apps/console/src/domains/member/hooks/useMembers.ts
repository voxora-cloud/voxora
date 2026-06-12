import { useQuery } from "@tanstack/react-query";
import { membersApi } from "../api/members.api";

export function useMembers() {
  return useQuery({
    queryKey: ["members"],
    queryFn: () => membersApi.listMembers(),
    select: (data) => data.data?.members || [],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
