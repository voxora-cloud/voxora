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
export interface ContextMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export interface ContextResult {
  /** System-level instruction injected at the start of every conversation */
  systemPrompt: string;
  /** Full conversation history, oldest first (includes current user message as last entry) */
  messages: ContextMessage[];
  /** Total number of turns in the thread (history + current message) */
  turnCount: number;
  /** Whether human agents are available — determines if escalation is possible */
  hasTeam: boolean;
}
