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
