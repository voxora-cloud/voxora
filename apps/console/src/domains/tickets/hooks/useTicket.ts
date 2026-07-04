import { useQuery } from "@tanstack/react-query";
import { ticketsApi } from "../api/tickets.api";

/**
 * Fetches a single ticket by ID with full details (contactProfile, notes, requesterContact).
 * Used by the full-page ticket detail view.
 */
export const useTicket = (ticketId: string | undefined) => {
  return useQuery({
    queryKey: ["ticket", ticketId],
    queryFn: () => ticketsApi.getTicket(ticketId!),
    enabled: !!ticketId,
    select: (res) => res.data?.ticket ?? null,
    staleTime: 30_000,
  });
};
