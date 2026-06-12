import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ticketsApi } from "../api/tickets.api";

export const useUpdateTicketStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["update-ticket-status"],
    mutationFn: ({
      ticketId,
      status,
    }: {
      ticketId: string;
      status: "open" | "in_progress" | "resolved" | "closed";
    }) => ticketsApi.updateStatus(ticketId, status),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      queryClient.invalidateQueries({ queryKey: ["ticket", variables.ticketId] });
    },
  });
};
