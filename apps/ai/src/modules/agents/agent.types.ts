export interface ToolParameterSchema {
  type: "string" | "number" | "boolean" | "object" | "array";
  description: string;
  required?: boolean;
  enum?: unknown[];
}

export interface Tool {
  /** Unique snake_case name exposed to the LLM */
  readonly name: string;
  /** Human-readable description used in the LLM function-calling schema */
  readonly description: string;
  /** JSON-schema-style parameter definitions */
  readonly parameters: Record<string, ToolParameterSchema>;
  execute(args: Record<string, unknown>): Promise<unknown>;
}
