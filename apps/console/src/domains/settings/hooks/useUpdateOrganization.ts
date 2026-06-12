import { useMutation, useQueryClient } from "@tanstack/react-query";
import { settingsApi, type UpdateOrganizationPayload } from "../api/settings.api";
import { useAuth } from "@/domains/auth/hooks";
import { toast } from "sonner";

export const useUpdateOrganization = () => {
  const queryClient = useQueryClient();
  const { organization: currentOrg, setOrganization } = useAuth();

  return useMutation({
    mutationFn: (payload: UpdateOrganizationPayload) =>
      settingsApi.updateOrganization(currentOrg!._id, payload),
    onSuccess: (response) => {
      if (response.success) {
        const updatedOrg = response.data.organization;
        queryClient.setQueryData(["organization", currentOrg?._id], response);
        queryClient.invalidateQueries({ queryKey: ["organization", currentOrg?._id] });
        if (currentOrg?._id === updatedOrg._id) {
          setOrganization(updatedOrg);
        }
        toast.success("Organization updated successfully");
      }
    },
    onError: (error: unknown) => {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (error instanceof Error ? error.message : "Failed to update organization");
      toast.error(message);
    },
  });
};
