import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { contactsApi } from "../api/contacts.api";
import type { ContactListItem, ContactConflictItem } from "../types/types";

export function useContacts() {
  return useQuery<ContactListItem[], Error>({
    queryKey: ["contacts"],
    queryFn: () => contactsApi.getContacts(),
    refetchInterval: 8000,
  });
}

export function usePendingConflicts() {
  return useQuery<ContactConflictItem[], Error>({
    queryKey: ["contacts", "conflicts"],
    queryFn: () => contactsApi.getPendingConflicts(),
    refetchInterval: 8000,
  });
}

export function useResolveConflict() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ conflictId, action }: { conflictId: string; action: "apply" | "dismiss" }) =>
      contactsApi.resolveConflict(conflictId, action),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["contacts", "conflicts"] });
    },
  });
}

export function useDeleteContacts() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => contactsApi.deleteContacts(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    },
  });
}

export function useBulkAddTags() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ids, tags }: { ids: string[]; tags: string[] }) =>
      contactsApi.bulkAddTags(ids, tags),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    },
  });
}

export function useUpdateContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name, email, phone, company, tags }: { id: string; name?: string; email?: string; phone?: string; company?: string; tags?: string[] }) =>
      contactsApi.updateContact(id, { name, email, phone, company, tags }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["conversation"] });
    },
  });
}
