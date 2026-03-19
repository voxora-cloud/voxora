export interface AIJobData {
  organizationId: string;
  conversationId: string;
  content: string;
  messageId: string;
  /** Display name of the company whose widget initiated the conversation */
  companyName?: string;
  /** teamId for the conversation — passed through to context builder */
  teamId?: string;
  /** Whether the widget allows escalation to a human agent */
  fallbackToAgent?: boolean;
  /** Which visitor info fields the AI should proactively collect */
  collectUserInfo?: {
    name?: boolean;
    email?: boolean;
    phone?: boolean;
  };
}

export interface PipelineResult {
  conversationId: string;
  response: string;
}
