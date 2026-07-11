export interface AssistMessage {
  role?: "system" | "user" | "assistant" | "tool" | "agent" | "customer" | "ai";
  content?: string;
  senderName?: string;
  source?: string;
}

export interface AssistRequestBody {
  messages?: AssistMessage[];
  conversationId?: string;
  organizationId?: string;
  contactName?: string;
  draft?: string;
  mode?: "variations" | "reframe";
}
