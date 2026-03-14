import { useMutation } from "@tanstack/react-query";
import { authApi } from "../api/auth.api";

interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export const useChangePassword = () => {
  return useMutation({
    mutationFn: ({ currentPassword, newPassword }: ChangePasswordPayload) => 
      authApi.changePassword(currentPassword, newPassword),
    onSuccess: () => {
      console.log("Password changed successfully");
    },
    onError: (error: Error) => {
      console.error("Change password failed:", error.message);
    },
  });
};
