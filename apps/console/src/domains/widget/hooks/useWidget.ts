import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { widgetApi } from "../api/widget.api";

export const useWidget = () => {
  return useQuery({
    queryKey: ["widget"],
    queryFn: () => widgetApi.getWidget(),
    select: (response) => response.data,
  });
};

export const useVerifyDomain = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => widgetApi.verifyDomain(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["widget"] });
    },
  });
};

const invalidateDomains = (queryClient: ReturnType<typeof useQueryClient>) => {
  queryClient.invalidateQueries({ queryKey: ["widget-domains"] });
  queryClient.invalidateQueries({ queryKey: ["widget"] });
};

export const useWidgetDomains = () =>
  useQuery({
    queryKey: ["widget-domains"],
    queryFn: () => widgetApi.getDomains(),
    select: (response) => response.data,
  });

export const useAddWidgetDomain = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: widgetApi.addDomain,
    onSuccess: () => invalidateDomains(queryClient),
  });
};

export const useUpdateWidgetDomain = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      domainId,
      data,
    }: {
      domainId: string;
      data: { domain?: string; includeSubdomains?: boolean };
    }) => widgetApi.updateDomain(domainId, data),
    onSuccess: () => invalidateDomains(queryClient),
  });
};

export const useRemoveWidgetDomain = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: widgetApi.removeDomain,
    onSuccess: () => invalidateDomains(queryClient),
  });
};

export const useVerifyWidgetDomain = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: widgetApi.verifyDomainById,
    onSuccess: () => invalidateDomains(queryClient),
  });
};
