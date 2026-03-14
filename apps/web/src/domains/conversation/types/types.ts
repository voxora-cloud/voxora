export interface ConversationParticipant {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface ConversationVisitor {
  sessionId: string;
  name: string;
  email: string;
  isAnonymous: boolean;
}

export interface ConversationMessage {
  _id: string;
  senderId: string;
  content: string;
  type: string;
  metadata: {
    senderName: string;
    senderEmail: string;
    source: string;
  };
  createdAt: string;
}

export interface ConversationListItem {
  _id: string;
  participants: ConversationParticipant[];
  subject: string;
  lastMessage?: {
    content: string;
    createdAt: string;
    senderId: {
      name: string;
    };
  };
  status: "open" | "pending" | "resolved" | "closed";
  priority: "low" | "medium" | "high" | "urgent";
  tags: string[];
  visitor?: ConversationVisitor;
  metadata?: {
    source?: string;
    customer?: {
      name?: string;
      email?: string;
      phone?: string;
      initialMessage?: string;
      startedAt?: string;
    };
    customerName?: string;
  };
  unreadCount: number;
  createdAt: string;
  lastMessageAt?: string;
}

export interface ConversationDetail {
  _id: string;
  subject: string;
  status: string;
  priority: string;
  visitor?: ConversationVisitor;
  metadata: {
    customer?: {
      name?: string;
      email?: string;
      phone?: string;
    };
    source?: string;
  };
}

export interface TeamOption {
  _id: string;
  name: string;
}

export interface AgentOption {
  _id: string;
  name: string;
  email: string;
}


export interface ConversationsResponse {
  success: boolean;
  data: {
    conversations: ConversationListItem[];
  };
}

export interface ConversationDetailResponse {
  success: boolean;
  data: {
    conversation: ConversationDetail;
    messages: ConversationMessage[];
  };
}

export interface StatusResponse {
  success: boolean;
  data: {
    conversation: ConversationDetail;
  };
}

export interface VisitorUpdateResponse {
  success: boolean;
  data: {
    name?: string;
    email?: string;
    isAnonymous: boolean;
  };
}

export interface RouteResponse {
  success: boolean;
  data: {
    conversationId: string;
    assignedTo?: string;
    teamId?: string;
    teamName?: string;
    agentName?: string;
  };
}

export interface TeamsResponse {
  success: boolean;
  data: TeamOption[];
}

export interface TeamAgentsResponse {
  success: boolean;
  data: AgentOption[];
}
