import { useMutation } from "@tanstack/react-query";
import { useAuthStore } from "../store/auth.store";

interface AcceptInvitePayload {
  token: string;
  password?: string;
}

export const useAcceptInvite = () => {
  const acceptInvite = useAuthStore((state) => state.acceptInvite);

  return useMutation({
    mutationFn: ({ token, password }: AcceptInvitePayload) => 
      acceptInvite(token, password),
    onSuccess: () => {
      console.log("Invite accepted successfully");
    },
    onError: (error: Error) => {
      console.error("Accept invite failed:", error.message);
    },
  });
};
