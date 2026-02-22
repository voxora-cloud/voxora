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
