import { Tool } from "../agent.types";

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
import { RewriteAndThinkTool } from "./rewrite-and-think.tool";
import { WebCrawlTool } from "./web-crawl.tool";
import { UpdateContactProfileTool } from "./update-contact-profile.tool";

registerTool(new RewriteAndThinkTool());
registerTool(new WebCrawlTool());
registerTool(new UpdateContactProfileTool());

export type { Tool, ToolParameterSchema } from "../agent.types";
