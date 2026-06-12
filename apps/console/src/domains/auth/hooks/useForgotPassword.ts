import { useMutation } from "@tanstack/react-query";
import { authApi } from "../api/auth.api";

export const useForgotPassword = () => {
  return useMutation({
    mutationFn: (email: string) => authApi.forgotPassword(email),
    onSuccess: () => {
      console.log("Password reset email sent");
    },
    onError: (error: Error) => {
      console.error("Forgot password failed:", error.message);
    },
  });
};
