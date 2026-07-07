import {
  Tool,
  ToolExecutionContext,
  ToolParameterSchema,
} from "../agent.types";
import { vectorStore } from "../../../infrastructure/vector";
import { ProviderFactory } from "../../../infrastructure/providers";

const STOP_WORDS = new Set([
  "a",
  "about",
  "an",
  "and",
  "are",
  "as",
  "ask",
  "at",
  "be",
  "for",
  "from",
  "i",
  "in",
  "is",
  "it",
  "me",
  "my",
  "of",
  "on",
  "or",
  "tell",
  "that",
  "the",
  "this",
  "to",
  "what",
  "who",
  "why",
  "with",
  "you",
]);

function meaningfulTokens(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && !STOP_WORDS.has(token));
}

function hasLexicalMatch(
  query: string,
  payload: Record<string, unknown>,
): boolean {
  const queryTokens = meaningfulTokens(query);
  if (queryTokens.length === 0) return false;

  const searchable = [
    payload.content,
    payload.text,
    payload.fileName,
    payload.title,
    payload.sourceUrl,
  ]
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .toLowerCase();

  return queryTokens.some((token) => searchable.includes(token));
}

export class KnowledgeRetrievalTool implements Tool {
  readonly name = "knowledge_retrieval";
  readonly description =
    "Search uploaded knowledge base documents, text entries, files, and crawled pages using semantic retrieval. Use this before answering organization/product questions that may be covered by uploaded knowledge. This is the general RAG tool.";

  readonly parameters: Record<string, ToolParameterSchema> = {
    query: {
      type: "string",
      description: "The user's question to search for in uploaded knowledge.",
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
      if (!organizationId)
        return { status: "error", message: "organizationId is required" };

      let topK = 3;
      if (typeof args.topK === "number") {
        topK = Math.min(args.topK, 5);
      } else if (typeof args.topK === "string") {
        const parsed = parseInt(args.topK, 10);
        if (!isNaN(parsed)) {
          topK = Math.min(parsed, 5);
        }
      }

      const embeddingProvider = ProviderFactory.getEmbeddingProvider();
      const queryVector = await embeddingProvider.embed(query, {
        organizationId,
        conversationId: context?.conversationId,
      });

      const results = await vectorStore.search(queryVector, {
        organizationId,
        topK,
      });

      if (!results.length) {
        return {
          status: "no_results",
          message: "No relevant uploaded knowledge found",
          results: [],
        };
      }

      const isSmallModel = embeddingProvider.dimensions <= 384;
      const minScore = isSmallModel ? 0.5 : 0.65;
      const relevant = results.filter((r) => {
        if ((r.payload as any)?.type === "faq") return false;
        if (r.score >= minScore) return true;
        return hasLexicalMatch(query, r.payload as Record<string, unknown>);
      });

      if (!relevant.length) {
        return {
          status: "no_results",
          message:
            "No sufficiently relevant uploaded knowledge found for this question",
          results: [],
        };
      }

      return {
        status: "ok",
        results: relevant.map((r) => ({
          content:
            (r.payload as any)?.content || (r.payload as any)?.text || "",
          source:
            (r.payload as any)?.fileName ||
            (r.payload as any)?.sourceUrl ||
            "Uploaded knowledge",
          score: Math.round(r.score * 100) / 100,
        })),
      };
    } catch (e: any) {
      return {
        status: "error",
        message: e?.message || "Knowledge retrieval failed",
      };
    }
  }
}
