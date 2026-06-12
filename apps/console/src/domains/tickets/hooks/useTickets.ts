import { useQuery } from "@tanstack/react-query";
import { ticketsApi } from "../api/tickets.api";

export interface TicketsQueryFilters {
  status?: string;
  priority?: string;
  assignedTo?: string;
  page?: number;
  limit?: number;
}

export const useTickets = (filters: TicketsQueryFilters = {}) => {
  return useQuery({
    queryKey: ["tickets", filters],
    queryFn: () => ticketsApi.listTickets(filters),
    placeholderData: (previousData) => previousData,
  });
};
