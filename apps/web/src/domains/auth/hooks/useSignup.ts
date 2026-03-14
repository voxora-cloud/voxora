import { useMutation } from "@tanstack/react-query";
import { useAuthStore } from "../store/auth.store";
import type { SignupPayload } from "../types/types";

export const useSignup = () => {
  const signup = useAuthStore((state) => state.signup);

  return useMutation({
    mutationFn: (data: SignupPayload) => signup(data),
    onSuccess: () => {
      // Signup success handled in store (redirect happens there)
    },
    onError: (error: Error) => {
      console.error("Signup failed:", error.message);
    },
  });
};
