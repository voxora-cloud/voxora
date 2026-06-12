import { useMutation, useQueryClient } from "@tanstack/react-query";
import { membersApi } from "../api/members.api";
import { toast } from "sonner";
import type { Member, MembersResponse } from "../types/types";

export function useRemoveMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["removeMember"],
    mutationFn: async (memberId: string) => {
      // Add artificial delay for optimistic update visibility
      await new Promise((resolve) => setTimeout(resolve, 1500));
      return membersApi.removeMember(memberId);
    },
    onMutate: async (memberId) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: ["members"] });

      // Snapshot previous value
      const previousData =
        queryClient.getQueryData<MembersResponse>(["members"]);

      // Optimistically remove member
      if (previousData) {
        const updatedMembers = previousData.data.members.filter(
          (member: Member) => member.membershipId !== memberId
        );

        const updatedData: MembersResponse = {
          ...previousData,
          data: {
            members: updatedMembers,
          },
        };

        queryClient.setQueryData<MembersResponse>(["members"], updatedData);
      }

      return { previousData };
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData<MembersResponse>(
          ["members"],
          context.previousData
        );
      }
      toast.error("Failed to remove member");
    },
    onSuccess: () => {
      toast.success("Member removed successfully");
    },
    onSettled: () => {
      // Refetch to get real data
      queryClient.invalidateQueries({ queryKey: ["members"] });
    },
  });
}
