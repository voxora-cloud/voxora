import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ticketsApi } from "../api/tickets.api";
import type { CreateTicketData } from "../types/types";

export const useCreateTicket = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["create-ticket"],
    mutationFn: (data: CreateTicketData) => ticketsApi.createTicket(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
  });
};
