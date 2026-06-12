export interface ToolParameterSchema {
  type: "string" | "number" | "boolean" | "object" | "array";
  description: string;
  required?: boolean;
  enum?: unknown[];
  items?: {
    type: "string" | "number" | "boolean" | "object" | "array";
  };
}

export interface ToolExecutionContext {
  organizationId?: string;
  conversationId?: string;
  messageId?: string;
}

export interface Tool {
   
  readonly name: string;
   
  readonly description: string;
   
  readonly parameters: Record<string, ToolParameterSchema>;
  execute(args: Record<string, unknown>, context?: ToolExecutionContext): Promise<unknown>;
}
