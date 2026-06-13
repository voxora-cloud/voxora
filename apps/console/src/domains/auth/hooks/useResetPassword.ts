import { useMutation } from "@tanstack/react-query";
import { authApi } from "../api/auth.api";

interface ResetPasswordPayload {
  email: string;
  code: string;
  newPassword: string;
}

export const useResetPassword = () => {
  return useMutation({
    mutationFn: (data: ResetPasswordPayload) => 
      authApi.resetPasswordWithOTP(data),
    onSuccess: () => {
      console.log("Password reset successfully");
    },
    onError: (error: Error) => {
      console.error("Reset password failed:", error.message);
    },
  });
};
