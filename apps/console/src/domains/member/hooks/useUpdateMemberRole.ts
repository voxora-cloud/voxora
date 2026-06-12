import { useMutation, useQueryClient } from "@tanstack/react-query";
import { membersApi } from "../api/members.api";
import { toast } from "sonner";
import type { OrgRole, Member, MembersResponse } from "../types/types";

export function useUpdateMemberRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["updateMemberRole"],
    mutationFn: async ({
      memberId,
      role,
    }: {
      memberId: string;
      role: OrgRole;
    }) => {
      // Add artificial delay for optimistic update visibility
      await new Promise((resolve) => setTimeout(resolve, 1500));
      return membersApi.updateMemberRole(memberId, role);
    },
    onMutate: async ({ memberId, role }) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: ["members"] });

      // Snapshot previous value
      const previousData =
        queryClient.getQueryData<MembersResponse>(["members"]);

      // Optimistically update member role
      if (previousData) {
        const updatedMembers = previousData.data.members.map(
          (member: Member) =>
            member.membershipId === memberId ? { ...member, role } : member
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
      toast.error("Failed to update member role");
    },
    onSuccess: () => {
      toast.success("Member role updated successfully");
    },
    onSettled: () => {
      // Refetch to get real data
      queryClient.invalidateQueries({ queryKey: ["members"] });
    },
  });
}
