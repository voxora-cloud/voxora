import { Tool } from "./types";

// ─── Tool registry ────────────────────────────────────────────────────────────
const registry = new Map<string, Tool>();

export function registerTool(tool: Tool): void {
  registry.set(tool.name, tool);
  console.log(`[Tools] Registered tool: ${tool.name}`);
}

export function getTool(name: string): Tool | undefined {
  return registry.get(name);
}

/** Returns all registered tools as a list (used to build LLM function schemas) */
export function getAllTools(): Tool[] {
  return [...registry.values()];
}

// ─── Register built-in tools here ────────────────────────────────────────────
// Example:
//   import { SearchKnowledgeBaseTool } from "./search-knowledge-base";
//   registerTool(new SearchKnowledgeBaseTool());

export type { Tool, ToolParameterSchema } from "./types";
