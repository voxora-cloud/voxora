import { useQuery } from "@tanstack/react-query";
import { widgetApi } from "../api/widget.api";

export const useWidget = () => {
  return useQuery({
    queryKey: ["widget"],
    queryFn: () => widgetApi.getWidget(),
    select: (response) => response.data,
  });
};
