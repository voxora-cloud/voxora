export interface ListConversationsOptions {
    status?: string;
    limit?: number;
    offset?: number;
    assignedTo?: string | null;
}

export interface UpdateVisitorInfoInput {
    name?: string;
    email?: string;
    sessionId?: string;
}

export interface RouteConversationInput {
    agentId?: string;
    reason?: string;
}
