import { useMutation, useQueryClient } from "@tanstack/react-query";
import { membersApi } from "../api/members.api";
import { toast } from "sonner";
import type { InviteMemberData, Member, MembersResponse } from "../types/types";

export function useInviteMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["inviteMember"],
    mutationFn: async (data: InviteMemberData) => {
      // Add artificial delay for optimistic update visibility
      await new Promise((resolve) => setTimeout(resolve, 1500));
      return membersApi.inviteMember(data);
    },
    onMutate: async (newMember) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: ["members"] });

      // Snapshot previous value
      const previousData =
        queryClient.getQueryData<MembersResponse>(["members"]);

      // Optimistically add member
      if (previousData) {
        const tempMember: Member = {
          membershipId: `temp-${Date.now()}`,
          userId: `temp-user-${Date.now()}`,
          user: {
            _id: `temp-user-${Date.now()}`,
            name: newMember.name,
            email: newMember.email,
          },
          role: newMember.role,
          inviteStatus: "pending",
          teams: [],
          organizationId: "",
        };

        const updatedData: MembersResponse = {
          ...previousData,
          data: {
            members: [tempMember, ...previousData.data.members],
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
      toast.error("Failed to invite member");
    },
    onSuccess: (_data, variables) => {
      toast.success("Member invited successfully", {
        description: `An invitation has been sent to ${variables.email}`,
      });
    },
    onSettled: () => {
      // Refetch to get real data
      queryClient.invalidateQueries({ queryKey: ["members"] });
    },
  });
}
