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

export interface AssistHttpRequest {
  method?: string;
  url?: string;
  headers: Record<string, string | string[] | undefined>;
  on(event: "data", callback: (chunk: Buffer) => void): void;
  on(event: "end", callback: () => void): void;
  on(event: "error", callback: (error: Error) => void): void;
}

export interface AssistHttpResponse {
  writeHead(statusCode: number, headers?: Record<string, string>): void;
  end(data?: string): void;
}
