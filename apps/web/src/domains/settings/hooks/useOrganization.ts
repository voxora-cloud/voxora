import { useQuery } from "@tanstack/react-query";
import { settingsApi } from "../api/settings.api";

export const useOrganization = (orgId: string | undefined) => {
  return useQuery({
    queryKey: ["organization", orgId],
    queryFn: () => settingsApi.getOrganization(orgId!),
    enabled: !!orgId,
    select: (response) => response.data.organization,
  });
};
