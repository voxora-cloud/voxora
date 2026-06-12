export interface AIJobData {
  organizationId: string;
  conversationId: string;
  content: string;
  messageId: string;
   
  companyName?: string;
   
  fallbackToAgent?: boolean;
   
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
   
  systemPrompt: string;
   
  messages: ContextMessage[];
   
  turnCount: number;
}
