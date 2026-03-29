import { useMutation } from "@tanstack/react-query";
import { settingsApi } from "../api/settings.api";
import { useLogout } from "@/domains/auth/hooks/useLogout";
import { toast } from "sonner";

export const useDeleteOrganization = () => {
  const { mutate: logout } = useLogout();

  return useMutation({
    mutationFn: (orgId: string) => settingsApi.deleteOrganization(orgId),
    onSuccess: (response) => {
      if (response.success) {
        toast.success("Organization has been deleted");
        logout();
      }
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error ? error.message : "Failed to delete organization";
      toast.error(message);
    },
  });
};
