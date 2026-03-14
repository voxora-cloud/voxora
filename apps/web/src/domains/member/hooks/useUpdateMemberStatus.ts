import { useMutation, useQueryClient } from "@tanstack/react-query";
import { membersApi } from "../api/members.api";
import { toast } from "sonner";
import type { Member, MembersResponse } from "../types/types";

export function useUpdateMemberStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["updateMemberStatus"],
    mutationFn: async ({
      memberId,
      status,
    }: {
      memberId: string;
      status: "active" | "inactive";
    }) => {
      // Add artificial delay for optimistic update visibility
      await new Promise((resolve) => setTimeout(resolve, 1500));
      return membersApi.updateMemberStatus(memberId, status);
    },
    onMutate: async ({ memberId, status }) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: ["members"] });

      // Snapshot previous value
      const previousData =
        queryClient.getQueryData<MembersResponse>(["members"]);

      // Optimistically update member status
      if (previousData) {
        const updatedMembers = previousData.data.members.map(
          (member: Member) =>
            member.membershipId === memberId
              ? { ...member, inviteStatus: status }
              : member
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
      toast.error("Failed to update member status");
    },
    onSuccess: (_data, variables) => {
      const action = variables.status === "active" ? "reactivated" : "suspended";
      toast.success(`Member ${action} successfully`);
    },
    onSettled: () => {
      // Refetch to get real data
      queryClient.invalidateQueries({ queryKey: ["members"] });
    },
  });
}
