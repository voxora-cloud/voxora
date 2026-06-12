import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { agentsApi } from "../api/agents.api";

export const useResendInvite = () => {
  return useMutation({
    mutationKey: ["resendInvite"],
    mutationFn: (agentId: string) => agentsApi.resendInvite(agentId),
    onSuccess: () => {
      toast.success("Invitation resent successfully");
    },
    onError: () => {
      toast.error("Failed to resend invitation");
    },
  });
};
