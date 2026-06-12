import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ticketsApi } from "../api/tickets.api";

export const useAssignTicket = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["assign-ticket"],
    mutationFn: ({ ticketId, memberId }: { ticketId: string; memberId: string | null }) =>
      ticketsApi.assignTicket(ticketId, memberId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      queryClient.invalidateQueries({ queryKey: ["ticket", variables.ticketId] });
    },
  });
};
