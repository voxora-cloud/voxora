export interface DashboardSummary {
  totalMessages: number;
  totalConversations: number;
  resolvedConversations: number;
  totalUsersServed: number;
  humanEscalationRate: number;
  avgResolutionTimeMs: number | null;
  widgetLoads: number;
  mostAskedQuestions: Array<{ question: string; count: number }>;
  source: {
    widget: number;
    qr: number;
    link: number;
    email: number;
    whatsapp: number;
    telegram: number;
    web: number;
  };
  aiCost: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    estimatedCostUsd: number;
  };
}

export interface DashboardTrends {
  conversationStatus: Array<{
    date: string;
    started: number;
    resolved: number;
    opened: number;
  }>;
  messageVolume: Array<{
    date: string;
    ai: number;
    agent: number;
  }>;
  aiCost: Array<{
    date: string;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    estimatedCostUsd: number;
  }>;
}

export interface AgentDashboardStats {
  overview: {
    totalConversations: number;
    activeConversations: number;
    waitingForAgent: number;
    resolvedToday: number;
    handledToday: number;
    messagesSentToday: number;
    avgResponseTimeMs: number | null;
    avgResolutionTimeMs: number | null;
    changes: {
      resolvedToday: number;
      handledToday: number;
      messagesSentToday: number;
    };
  };
  activity: Array<{ day: string; conversations: number; messages: number }>;
  responseTime: Array<{ hour: string; responseTime: number }>;
  conversationBreakdown: Array<{ status: string; count: number }>;
  weekSummary: {
    conversationsHandled: number;
    conversationsChange: number;
    messagesSent: number;
    messagesChange: number;
    resolutionRate: number;
    resolutionRateChange: number;
  };
}
