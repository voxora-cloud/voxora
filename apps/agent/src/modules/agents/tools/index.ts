import { Tool } from "../agent.types";


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

export interface ToolFilterOptions {
  fallbackToAgent?: boolean;
}

/** Returns dynamically filtered tools based on conversation context/configuration */
export function getToolsForContext(options: ToolFilterOptions): Tool[] {
  let tools = [...registry.values()];

  // If escalation is disabled, exclude escalate_to_human tool completely
  if (options.fallbackToAgent === false) {
    tools = tools.filter((tool) => tool.name !== "escalate_to_human");
  }

  return tools;
}

// ─── Register built-in tools ─────────────────────────────────────────────────
import { RewriteAndThinkTool } from "./rewrite-and-think.tool";
import { WebCrawlTool } from "./web-crawl.tool";
import { UpdateContactProfileTool } from "./update-contact-profile.tool";
import { MarkQueryResolvedTool } from "./mark-query-resolved.tool";

// New tools
import { FaqRetrievalTool } from "./faq-retrieval.tool";
import { ConversationMemoryTool } from "./conversation-memory.tool";
import { SendEmailTool } from "./send-email.tool";
import { VerifyEmailOtpTool } from "./verify-email-otp.tool";
import { CreateTicketTool } from "./create-ticket.tool";
import { UpdateTicketTool } from "./update-ticket.tool";
import { CloseTicketTool } from "./close-ticket.tool";
import { EscalateToHumanTool } from "./escalate-to-human.tool";
import { SeekContactTool } from "./seek-contact.tool";

// Built-in
registerTool(new RewriteAndThinkTool());
registerTool(new WebCrawlTool());
registerTool(new UpdateContactProfileTool());
registerTool(new MarkQueryResolvedTool());

// New AI tools
registerTool(new FaqRetrievalTool());
registerTool(new ConversationMemoryTool());
registerTool(new SendEmailTool());
registerTool(new VerifyEmailOtpTool());
registerTool(new CreateTicketTool());
registerTool(new UpdateTicketTool());
registerTool(new CloseTicketTool());
registerTool(new EscalateToHumanTool());
registerTool(new SeekContactTool());

export type { Tool, ToolParameterSchema } from "../agent.types";
