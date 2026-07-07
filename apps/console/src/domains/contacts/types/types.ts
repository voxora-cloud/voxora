export interface ContactNote {
  id: string;
  author: string;
  content: string;
  createdAt: string;
}

export interface ContactConversation {
  id: string;
  status: "open" | "resolved" | "closed";
  lastMessage: string;
  channel: string;
  updatedAt: string;
}

export interface ContactInsight {
  summary: string;
  sentiment: "positive" | "neutral" | "negative";
  topics: string[];
}

export interface ContactConflict {
  id: string;
  field: "name" | "phone" | "company";
  currentValue: string;
  proposedValue: string;
  conversationId: string;
  createdAt: string;
}

export interface Contact {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  tags: string[];
  lastActivity: string;
  createdAt: string;
  isOnline: boolean;
  conversationCount: number;
  notes: ContactNote[];
  conversations: ContactConversation[];
  insights: ContactInsight;
  conflicts: ContactConflict[];
}

export interface ContactListItem {
  id: string;
  sessionId: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  tags: string[];
  source: "ai" | "widget" | "agent" | "owner" | "admin";
  notes: Array<{
    id: string;
    author: string;
    content: string;
    createdAt: string;
  }>;
  conversations: Array<{
    id: string;
    status: "open" | "resolved" | "closed";
    lastMessage: string;
    channel: string;
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

export const toContactViewModel = (item: ContactListItem): Contact => ({
  id: item.id,
  name: item.name,
  email: item.email,
  phone: item.phone,
  company: item.company,
  tags: item.tags || [],
  lastActivity: item.lastActivity,
  createdAt: item.createdAt,
  isOnline: false,
  conversationCount: item.conversationCount,
  notes: item.notes || [],
  conversations:
    item.conversations && item.conversations.length > 0
      ? item.conversations
      : [
          {
            id: `conv-${item.id}`,
            status: "open",
            lastMessage: "Conversation context is still syncing.",
            channel: "widget",
            updatedAt: item.updatedAt,
          },
        ],
  insights: {
    summary:
      item.insights?.summary ||
      "No insights yet. Continue conversations to generate AI insights.",
    sentiment: item.insights?.sentiment || "neutral",
    topics: item.insights?.topics || [],
  },
  conflicts: item.conflicts || [],
});
