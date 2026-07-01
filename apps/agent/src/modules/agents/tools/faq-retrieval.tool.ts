import { Tool, ToolExecutionContext, ToolParameterSchema } from "../agent.types";
import { vectorStore } from "../../../infrastructure/vector";
import { ProviderFactory } from "../../../infrastructure/providers";

export class FaqRetrievalTool implements Tool {
  readonly name = "faq_retrieval";
  readonly description =
    "Search the organization's knowledge base for relevant information using semantic similarity. Call this BEFORE answering any product, feature, pricing, troubleshooting, or organization questions. Returns relevant content chunks if found. If no results, tell the user you don't have that information.";

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
      type: "string",
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

      let topK = 3;
      if (typeof args.topK === "number") {
        topK = Math.min(args.topK, 5);
      } else if (typeof args.topK === "string") {
        const parsed = parseInt(args.topK, 10);
        if (!isNaN(parsed)) {
          topK = Math.min(parsed, 5);
        }
      }

      // Embed the query
      const embeddingProvider = ProviderFactory.getEmbeddingProvider();
      const queryVector = await embeddingProvider.embed(query, {
        organizationId,
        conversationId: context?.conversationId,
      });

      // Search Qdrant
      const results = await vectorStore.search(queryVector, { organizationId, topK });

      if (!results.length) {
        return { status: "no_results", message: "No relevant content found in knowledge base", results: [] };
      }

      // Filter by minimum relevance score
      // Small 384d models (like MiniLM) produce lower similarity scores than 1024d models.
      const isSmallModel = embeddingProvider.dimensions <= 384;
      const MIN_SCORE = isSmallModel ? 0.50 : 0.65;
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
