import { apiClient } from "@/shared/lib/api-client";

export interface ContactListItem {
  id: string;
  sessionId: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  tags: string[];
  status: "active" | "inactive" | "blocked";
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
  timeline: Array<{
    id: string;
    label: string;
    timestamp: string;
    detail?: string;
  }>;
  insights: {
    summary: string;
    sentiment: "positive" | "neutral" | "negative";
    topics: string[];
  };
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

class ContactsApi {
  async getContacts(): Promise<ContactListItem[]> {
    const response = await apiClient.get<ContactsResponse>("/contacts");
    return response.data?.contacts || [];
  }
}

export const contactsApi = new ContactsApi();
