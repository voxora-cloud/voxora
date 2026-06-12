import { useMutation } from "@tanstack/react-query";
import { authApi } from "../api/auth.api";

interface ResetPasswordPayload {
  token: string;
  newPassword: string;
}

export const useResetPassword = () => {
  return useMutation({
    mutationFn: ({ token, newPassword }: ResetPasswordPayload) => 
      authApi.resetPassword(token, newPassword),
    onSuccess: () => {
      console.log("Password reset successfully");
    },
    onError: (error: Error) => {
      console.error("Reset password failed:", error.message);
    },
  });
};
