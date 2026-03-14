import { useMutation } from "@tanstack/react-query";
import { useAuthStore } from "../store/auth.store";
import type { LoginPayload } from "../types/types";

export const useLogin = () => {
  const login = useAuthStore((state) => state.login);

  return useMutation({
    mutationFn: (data: LoginPayload) => login(data),
    onSuccess: () => {
      // Login success handled in store (redirect happens there)
    },
    onError: (error: Error) => {
      console.error("Login failed:", error.message);
    },
  });
};