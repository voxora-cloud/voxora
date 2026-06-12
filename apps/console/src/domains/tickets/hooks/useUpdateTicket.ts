import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ticketsApi } from "../api/tickets.api";
import type { UpdateTicketData } from "../types/types";

export const useUpdateTicket = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["update-ticket"],
    mutationFn: ({ ticketId, data }: { ticketId: string; data: UpdateTicketData }) =>
      ticketsApi.updateTicket(ticketId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      queryClient.invalidateQueries({ queryKey: ["ticket", variables.ticketId] });
    },
  });
};
