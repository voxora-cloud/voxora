import { Tool, ToolExecutionContext, ToolParameterSchema } from "../agent.types";
import { internalApi } from "../../../infrastructure/api/internal.client";

export class SaveUnansweredQuestionTool implements Tool {
  readonly name = "save_unanswered_question";
  readonly description =
    "Save a knowledge gap when uploaded knowledge/docs cannot answer the user's question. Use after knowledge_retrieval or faq_retrieval returns no relevant answer. Returns only a simple confirmation.";

  readonly parameters: Record<string, ToolParameterSchema> = {
    question: {
      type: "string",
      description: "The unanswered user question to save for knowledge improvement.",
      required: true,
    },
    contactId: {
      type: "string",
      description: "Optional contact ID if already known from trusted context or prior tools.",
      required: false,
    },
  };

  async execute(args: Record<string, unknown>, context?: ToolExecutionContext): Promise<unknown> {
    try {
      const question = typeof args.question === "string" ? args.question.trim() : "";
      const contactId = typeof args.contactId === "string" ? args.contactId.trim() : "";
      const organizationId = context?.organizationId || "";
      const conversationId = context?.conversationId || "";

      if (!question) return { status: "error", message: "question is required" };
      if (!organizationId || !conversationId) {
        return { status: "error", message: "organizationId and conversationId are required" };
      }

      await internalApi.post("/knowledge/ai/unanswered-questions", {
        organizationId,
        conversationId,
        question,
        ...(contactId ? { contactId } : {}),
        source: "knowledge_gap",
      });

      return {
        status: "ok",
        message: "I saved this as an unanswered question for follow-up.",
      };
    } catch (e: any) {
      return {
        status: "error",
        message: e?.response?.data?.message || e.message || "Failed to save unanswered question",
      };
    }
  }
}
