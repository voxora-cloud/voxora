import { apiClient } from "@/shared/lib/api-client";

export interface ContactListItem {
  id: string;
  sessionId: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  tags: string[];
  source: "ai" | "widget" | "manual";
  notes: Array<{
    id: string;
    author: string;
    content: string;
    createdAt: string;
  }>;
  conversations: Array<{
    id: string;
    status: "open" | "pending" | "resolved" | "closed";
    lastMessage: string;
    updatedAt: string;
  }>;
  insights: {
    summary: string;
    sentiment: "positive" | "neutral" | "negative";
    topics: string[];
  };
  conflicts?: Array<{
    id: string;
    field: "name" | "phone" | "company";
    currentValue: string;
    proposedValue: string;
    conversationId: string;
    createdAt: string;
  }>;
  conversationCount: number;
  lastActivity: string;
  createdAt: string;
  updatedAt: string;
}

interface ContactsResponse {
  success: boolean;
  message: string;
  data: {
    contacts: ContactListItem[];
    total: number;
  };
}

export interface ContactConflictItem {
  id: string;
  contactId: string;
  contactName: string;
  contactEmail: string;
  field: "name" | "phone" | "company";
  currentValue: string;
  proposedValue: string;
  conversationId: string;
  createdAt: string;
}

interface ConflictsResponse {
  success: boolean;
  message: string;
  data: ContactConflictItem[];
}

class ContactsApi {
  async getContacts(): Promise<ContactListItem[]> {
    const response = await apiClient.get<ContactsResponse>("/contacts");
    return response.data?.contacts || [];
  }

  async deleteContacts(ids: string[]): Promise<void> {
    await apiClient.delete("/contacts", { ids });
  }

  async bulkAddTags(ids: string[], tags: string[]): Promise<void> {
    await apiClient.post("/contacts/tags", { ids, tags });
  }

  async addNote(id: string, content: string): Promise<any> {
    const res = await apiClient.post<any>(`/contacts/${id}/notes`, { content });
    return res.data;
  }

  async addTag(id: string, tag: string): Promise<string> {
    const res = await apiClient.post<any>(`/contacts/${id}/tags`, { tag });
    return res.data?.tag || tag;
  }

  async removeTag(id: string, tag: string): Promise<void> {
    await apiClient.delete(`/contacts/${id}/tags/${encodeURIComponent(tag)}`);
  }

  async getPendingConflicts(): Promise<ContactConflictItem[]> {
    const res = await apiClient.get<ConflictsResponse>("/contacts/conflicts");
    return res.data || [];
  }

  async resolveConflict(id: string, action: "apply" | "dismiss"): Promise<void> {
    await apiClient.post(`/contacts/conflicts/${id}/resolve`, { action });
  }
}

export const contactsApi = new ContactsApi();
