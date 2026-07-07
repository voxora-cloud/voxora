export interface ListConversationsOptions {
  status?: string;
  limit?: number;
  offset?: number;
  assignedTo?: string | null;
  userId?: string;
}

export interface RouteConversationInput {
  agentId?: string;
  reason?: string;
}
