import { useMutation } from "@tanstack/react-query";
import { useAuthStore } from "../store/auth.store";
import { queryClient } from "@/shared/lib/query-client";

export const useLogout = () => {
  const logout = useAuthStore((state) => state.logout);

  return useMutation({
    mutationFn: async () => {
      logout();
    },
    onSuccess: () => {
      // Clear all queries on logout
      queryClient.clear();
    },
  });
};
