import { useMutation, useQueryClient } from "@tanstack/react-query";
import { widgetApi } from "../api/widget.api";
import type { UpdateWidgetData, Widget } from "../types";

interface SaveWidgetPayload {
  data: UpdateWidgetData;
  isExisting: boolean;
}

export const useSaveWidget = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["save-widget"],
    mutationFn: ({ data, isExisting }: SaveWidgetPayload) =>
      isExisting ? widgetApi.updateWidget(data) : widgetApi.createWidget(data),
    onSuccess: (response) => {
      queryClient.setQueryData<Widget>(["widget"], response.data);
    },
  });
};
