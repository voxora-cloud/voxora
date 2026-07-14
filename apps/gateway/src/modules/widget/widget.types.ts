export type ServiceError = Error & { statusCode?: number };

export type AIInteractionSource = "widget" | "qr" | "link";

export interface InitConversationInput {
  organizationId: string;
  message: string;
  InteraOnePublicKey?: string;
  sessionId: string;
  source?: string;
}

export interface InitConversationResult {
  conversationId: string;
  sessionId: string;
  isAnonymous: boolean;
  assignedTo: string | null;
  assignedAgent: string | null;
  metadata?: Record<string, any>;
}

