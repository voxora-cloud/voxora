import { SystemEvent } from "@shared/models";
import logger from "@shared/core/logger";

// Shape expected from the agent's observability.worker
export interface IncomingAICallEvent {
  timestamp: string; // ISO string from the agent
  provider: string;
  modelId: string;
  callType: string;
  latencyMs: number;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  estimatedCostUsd?: number;
  success: boolean;
  error?: string;
  organizationId?: string;
  conversationId?: string;
}

export interface ObservabilitySummary {
  totalCalls: number;
  successRate: number;
  avgLatencyMs: number;
  totalTokens: number;
  totalCostUsd: number;
  byModel: Record<
    string,
    { calls: number; tokens: number; costUsd: number; avgLatencyMs: number }
  >;
  byCallType: Record<string, { calls: number; avgLatencyMs: number }>;
}

export class ObservabilityService {
  /**
   * Bulk-insert a batch of AI call events.
   * Uses ordered:false so a single bad document doesn't block the rest.
   */
  static async bulkInsert(
    events: IncomingAICallEvent[],
  ): Promise<{ inserted: number; failed: number }> {
    if (!events.length) return { inserted: 0, failed: 0 };

    const docs = events.map((e) => ({
      occurredAt: new Date(e.timestamp),
      category: "ai_observability",
      eventType: "llm_call",
      latencyMs: e.latencyMs,
      tokens: {
        prompt: e.inputTokens,
        completion: e.outputTokens,
        total: e.totalTokens,
      },
      estimatedCostUsd: e.estimatedCostUsd,
      success: e.success,
      error: e.error,
      organizationId: e.organizationId,
      conversationId: e.conversationId,
      metadata: {
        provider: e.provider,
        modelId: e.modelId,
        callType: e.callType,
      },
    }));

    try {
      const result = await SystemEvent.insertMany(docs, {
        ordered: false,
      } as any);
      return { inserted: Array.isArray(result) ? result.length : 0, failed: 0 };
    } catch (err: any) {
      // BulkWriteError — partial success
      if (err.name === "BulkWriteError" || err.code === 11000) {
        const inserted = err.result?.nInserted ?? 0;
        const failed = docs.length - inserted;
        logger.warn("[ObservabilityService] Partial bulk insert", {
          inserted,
          failed,
          error: err.message,
        });
        return { inserted, failed };
      }
      throw err;
    }
  }

  /**
   * Summarise AI call metrics for an organization over a rolling window.
   */
  static async getSummary(
    organizationId: string,
    days = 30,
  ): Promise<ObservabilitySummary> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const raw = await SystemEvent.aggregate<{
      _id: { modelId: string; callType: string };
      calls: number;
      successCount: number;
      totalLatency: number;
      totalTokens: number;
      totalCostUsd: number;
    }>([
      {
        $match: {
          organizationId,
          category: "ai_observability",
          eventType: "llm_call",
          occurredAt: { $gte: since },
        },
      },
      {
        $group: {
          _id: { modelId: "$metadata.modelId", callType: "$metadata.callType" },
          calls: { $sum: 1 },
          successCount: { $sum: { $cond: ["$success", 1, 0] } },
          totalLatency: { $sum: "$latencyMs" },
          totalTokens: { $sum: { $ifNull: ["$tokens.total", 0] } },
          totalCostUsd: { $sum: { $ifNull: ["$estimatedCostUsd", 0] } },
        },
      },
    ]);

    const summary: ObservabilitySummary = {
      totalCalls: 0,
      successRate: 0,
      avgLatencyMs: 0,
      totalTokens: 0,
      totalCostUsd: 0,
      byModel: {},
      byCallType: {},
    };

    let totalSuccess = 0;
    let totalLatency = 0;

    for (const row of raw) {
      const { modelId, callType } = row._id;

      summary.totalCalls += row.calls;
      totalSuccess += row.successCount;
      totalLatency += row.totalLatency;
      summary.totalTokens += row.totalTokens;
      summary.totalCostUsd += row.totalCostUsd;

      // By model
      if (!summary.byModel[modelId]) {
        summary.byModel[modelId] = {
          calls: 0,
          tokens: 0,
          costUsd: 0,
          avgLatencyMs: 0,
        };
      }
      summary.byModel[modelId].calls += row.calls;
      summary.byModel[modelId].tokens += row.totalTokens;
      summary.byModel[modelId].costUsd += row.totalCostUsd;
      summary.byModel[modelId].avgLatencyMs =
        (summary.byModel[modelId].avgLatencyMs *
          (summary.byModel[modelId].calls - row.calls) +
          row.totalLatency) /
        summary.byModel[modelId].calls;

      // By call type
      if (!summary.byCallType[callType]) {
        summary.byCallType[callType] = { calls: 0, avgLatencyMs: 0 };
      }
      const ct = summary.byCallType[callType];
      const prevTotal = ct.avgLatencyMs * ct.calls;
      ct.calls += row.calls;
      ct.avgLatencyMs = (prevTotal + row.totalLatency) / ct.calls;
    }

    summary.successRate =
      summary.totalCalls > 0
        ? Math.round((totalSuccess / summary.totalCalls) * 10000) / 100
        : 100;
    summary.avgLatencyMs =
      summary.totalCalls > 0
        ? Math.round(totalLatency / summary.totalCalls)
        : 0;
    summary.totalCostUsd =
      Math.round(summary.totalCostUsd * 1_000_000) / 1_000_000;

    return summary;
  }
}
