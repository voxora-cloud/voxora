import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ticketsApi } from "../api/tickets.api";

export const useAddTicketNote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["add-ticket-note"],
    mutationFn: ({ ticketId, content }: { ticketId: string; content: string }) =>
      ticketsApi.addNote(ticketId, content),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      queryClient.invalidateQueries({ queryKey: ["ticket", variables.ticketId] });
    },
  });
};
