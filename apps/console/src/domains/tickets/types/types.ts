export interface TicketNote {
  id: string;
  author: string;
  authorType: "agent" | "ai" | "system";
  content: string;
  createdAt: string;
}

export interface TicketRequesterContact {
  fullName: string | null;
  email: string | null;
  phone: string | null;
}

export interface Ticket {
  id: string;
  ticketNumber: string;
  organizationId: string;
  conversationId: string | null;
  contactId: string | null;
  title: string;
  description: string | null;
  status: "open" | "in_progress" | "resolved" | "closed";
  priority: "low" | "medium" | "high" | "urgent";
  source: "ai" | "agent" | "api";
  assignedTo: {
    id: string;
    name: string;
    email: string;
  } | null;
  tags: string[];
  notes: TicketNote[];
  resolutionNote: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  requesterContact?: TicketRequesterContact;
  createdAt: string;
  updatedAt: string;
}

export interface ListTicketsResponse {
  success: boolean;
  data: {
    tickets: Ticket[];
    total: number;
    page: number;
    pages: number;
  };
}

export interface TicketResponse {
  success: boolean;
  data: {
    ticket: Ticket;
  };
}

export interface CreateTicketData {
  title: string;
  description?: string;
  priority?: "low" | "medium" | "high" | "urgent";
  tags?: string[];
  conversationId?: string;
  contactId?: string;
}

export interface UpdateTicketData {
  title?: string;
  description?: string;
  priority?: "low" | "medium" | "high" | "urgent";
  status?: "open" | "in_progress" | "resolved" | "closed";
  assignedTo?: string | null;
  tags?: string[];
}
