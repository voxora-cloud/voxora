import { Tool, ToolExecutionContext, ToolParameterSchema } from "../agent.types";
import { vectorStore } from "../../../infrastructure/vector";
import { getEmbeddingProvider } from "../../../infrastructure/providers/embedding";

export class FaqRetrievalTool implements Tool {
  readonly name = "faq_retrieval";
  readonly description =
    "Search the organization's knowledge base for relevant FAQ answers using semantic similarity. Use this when the user asks a question that may be answered by your knowledge base. Only returns results if meaningful content matches — if nothing is relevant, do NOT send this to the agent.";

  readonly parameters: Record<string, ToolParameterSchema> = {
    query: {
      type: "string",
      description: "The user's question to search for in the knowledge base.",
      required: true,
    },
    organizationId: {
      type: "string",
      description: "Organization ID. Injected from runtime context.",
      required: false,
    },
    topK: {
      type: "number",
      description: "Max number of results to return (default: 3).",
      required: false,
    },
  };

  async execute(
    args: Record<string, unknown>,
    context?: ToolExecutionContext,
  ): Promise<unknown> {
    try {
      const query = typeof args.query === "string" ? args.query.trim() : "";
      if (!query) return { status: "error", message: "query is required" };

      const organizationId =
        (typeof args.organizationId === "string" ? args.organizationId : "") ||
        context?.organizationId ||
        "";
      if (!organizationId) return { status: "error", message: "organizationId is required" };

      const topK = typeof args.topK === "number" ? Math.min(args.topK, 5) : 3;

      // Embed the query
      const embeddingProvider = getEmbeddingProvider();
      const queryVector = await embeddingProvider.embed(query);

      // Search Qdrant
      const results = await vectorStore.search(queryVector, { organizationId, topK });

      if (!results.length) {
        return { status: "no_results", message: "No relevant content found in knowledge base", results: [] };
      }

      // Filter by minimum relevance score (0.65 threshold)
      const MIN_SCORE = 0.65;
      const relevant = results.filter((r) => r.score >= MIN_SCORE);

      if (!relevant.length) {
        return {
          status: "no_results",
          message: "No sufficiently relevant content found (below similarity threshold)",
          results: [],
        };
      }

      return {
        status: "ok",
        results: relevant.map((r) => ({
          content: (r.payload as any)?.content || (r.payload as any)?.text || "",
          source: (r.payload as any)?.fileName || (r.payload as any)?.sourceUrl || "Knowledge base",
          score: Math.round(r.score * 100) / 100,
        })),
      };
    } catch (e: any) {
      return { status: "error", message: e?.message || "FAQ retrieval failed" };
    }
  }
}
