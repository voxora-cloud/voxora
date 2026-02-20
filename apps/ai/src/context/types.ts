export interface ContextMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export interface ContextResult {
  /** System-level instruction injected at the start of every conversation */
  systemPrompt: string;
  /** Full conversation history, oldest first */
  messages: ContextMessage[];
}
