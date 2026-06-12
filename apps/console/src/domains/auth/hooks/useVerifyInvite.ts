import { useQuery } from "@tanstack/react-query";
import { authApi } from "../api/auth.api";

export const useVerifyInvite = (token: string | null) => {
  return useQuery({
    queryKey: ["verify-invite", token],
    queryFn: () => authApi.verifyInvite(token!),
    enabled: !!token,
    retry: false,
  });
};
