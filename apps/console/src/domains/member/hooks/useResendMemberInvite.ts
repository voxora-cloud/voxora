import { useMutation, useQueryClient } from "@tanstack/react-query";
import { membersApi } from "../api/members.api";
import { toast } from "sonner";

export function useResendMemberInvite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (memberId: string) => {
      return membersApi.resendMemberInvite(memberId);
    },
    onSuccess: () => {
      toast.success("Invitation resent successfully");
      queryClient.invalidateQueries({ queryKey: ["members"] });
    },
    onError: () => {
      toast.error("Failed to resend invitation");
    },
  });
}
