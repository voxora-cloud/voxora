export interface CreateTicketInput {
  organizationId: string;
  conversationId?: string;
  contactId?: string;
  title: string;
  description?: string;
  priority?: "low" | "medium" | "high" | "urgent";
  status?: "open" | "in_progress" | "resolved" | "closed";
  source?: "ai" | "agent" | "api";
  requesterName?: string;
  requesterEmail?: string;
  tags?: string[];
  idempotencyKey?: string;
}

export interface UpdateTicketInput {
  title?: string;
  description?: string;
  priority?: "low" | "medium" | "high" | "urgent";
  status?: "open" | "in_progress" | "resolved" | "closed";
  assignedTo?: string | null;
  tags?: string[];
}

export interface CloseTicketInput {
  resolutionNote?: string;
}

export interface ListTicketsOptions {
  status?: string;
  priority?: string;
  assignedTo?: string;
  limit?: number;
  page?: number;
}
