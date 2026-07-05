import { SystemEvent, Conversation, Message } from "@shared/models";
import dayjs from "dayjs";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import mongoose from "mongoose";
import { ConversationTrendRecord } from "./analytics.types";
import { redisClient } from "@shared/infra/redis";
import logger from "@shared/core/logger";

dayjs.extend(isSameOrBefore);

const CACHE_TTL = {
  summary: 5 * 60,    // 5 minutes
  trends: 10 * 60,    // 10 minutes
};

const CACHE_KEYS = {
  ownerSummary: (orgId: string, days: number) => `analytics:owner:summary:${orgId}:${days}d`,
  ownerTrends: (orgId: string, days: number) => `analytics:owner:trends:${orgId}:${days}d`,
};

export class AnalyticsService {
  static async getOwnerSummary(organizationId: string, days = 30) {
    const cacheKey = CACHE_KEYS.ownerSummary(organizationId, days);

    // Try Redis cache first
    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        logger.debug("Analytics summary cache hit", { organizationId, days });
        return JSON.parse(cached);
      }
    } catch (error) {
      logger.warn("Redis cache read failed, proceeding with query", { error });
    }

    // Cache miss - compute result
    const result = await this._computeOwnerSummary(organizationId, days);

    // Store in Redis
    try {
      await redisClient.setEx(cacheKey, CACHE_TTL.summary, JSON.stringify(result));
    } catch (error) {
      logger.warn("Redis cache write failed", { error });
    }

    return result;
  }

  private static async _computeOwnerSummary(organizationId: string, days: number) {
    const startDate = dayjs().subtract(days - 1, "days").startOf("day").toDate();
    const orgObjectId = new mongoose.Types.ObjectId(organizationId);

    // Single $facet pipeline for all Conversation aggregations
    const [conversationFacet, analyticsEventFacet, totalMessages] = await Promise.all([
      // ─────── SINGLE FACET FOR CONVERSATION QUERIES ───────
      Conversation.aggregate([
        {
          $match: {
            organizationId: orgObjectId,
            createdAt: { $gte: startDate },
          },
        },
        {
          $facet: {
            // Conversation stats (resolved, escalated, total)
            stats: [
              {
                $group: {
                  _id: null,
                  totalConversations: { $sum: 1 },
                  resolvedConversations: {
                    $sum: { $cond: [{ $eq: ["$status", "resolved"] }, 1, 0] },
                  },
                  escalatedConversations: {
                    $sum: {
                      $cond: [
                        {
                          $or: [
                            { $ne: ["$assignedTo", null] },
                            { $ifNull: ["$metadata.escalatedAt", false] },
                          ],
                        },
                        1,
                        0,
                      ],
                    },
                  },
                },
              },
            ],
            // Unique users served
            usersServed: [
              {
                $match: {
                  sessionId: { $exists: true, $ne: "" },
                },
              },
              {
                $group: {
                  _id: "$sessionId",
                },
              },
              { $count: "totalUsersServed" },
            ],
            // Average resolution time
            resolution: [
              {
                $match: {
                  status: { $in: ["resolved", "closed"] },
                  closedAt: { $ne: null },
                },
              },
              {
                $project: {
                  resolutionMs: { $subtract: ["$closedAt", "$createdAt"] },
                },
              },
              {
                $group: {
                  _id: null,
                  avgResolutionTimeMs: { $avg: "$resolutionMs" },
                },
              },
            ],
            // Top 5 asked questions
            questions: [
              {
                $match: {
                  "metadata.customer.initialMessage": {
                    $exists: true,
                    $type: "string",
                    $ne: "",
                  },
                },
              },
              {
                $project: {
                  question: {
                    $toLower: {
                      $trim: { input: "$metadata.customer.initialMessage" },
                    },
                  },
                },
              },
              {
                $group: {
                  _id: "$question",
                  count: { $sum: 1 },
                },
              },
              { $sort: { count: -1 } },
              { $limit: 5 },
            ],
            sources: [
              {
                $group: {
                  _id: {
                    $ifNull: [
                      "$metadata.interactionSource",
                      "$metadata.source",
                      "$channel",
                    ],
                  },
                  count: { $sum: 1 },
                },
              },
            ],
          },
        },
      ]),

      // ─────── SINGLE FACET FOR ANALYTICS EVENT QUERIES ───────
      SystemEvent.aggregate([
        {
          $addFields: {
            eventTime: { $ifNull: ["$occurredAt", "$createdAt"] },
          },
        },
        {
          $match: {
            organizationId: { $in: [organizationId, orgObjectId] },
            category: "analytics",
            eventTime: { $gte: startDate },
          },
        },
        {
          $facet: {
            // Widget loads
            widgetLoads: [
              {
                $match: { eventType: "widget_load" },
              },
              { $count: "widgetLoads" },
            ],
            // AI token usage
            aiCosts: [
              {
                $match: {
                  eventType: { $in: ["ai_response", "ai_token_usage"] },
                },
              },
              {
                $project: {
                  promptTokens: { $ifNull: ["$metadata.promptTokens", 0] },
                  completionTokens: {
                    $ifNull: ["$metadata.completionTokens", 0],
                  },
                  totalTokens: {
                    $ifNull: [
                      "$metadata.totalTokens",
                      {
                        $add: [
                          { $ifNull: ["$metadata.promptTokens", 0] },
                          { $ifNull: ["$metadata.completionTokens", 0] },
                        ],
                      },
                    ],
                  },
                  estimatedCostUsd: {
                    $ifNull: ["$metadata.estimatedCostUsd", 0],
                  },
                },
              },
              {
                $group: {
                  _id: null,
                  promptTokens: { $sum: "$promptTokens" },
                  completionTokens: { $sum: "$completionTokens" },
                  totalTokens: { $sum: "$totalTokens" },
                  estimatedCostUsd: { $sum: "$estimatedCostUsd" },
                },
              },
            ],
          },
        },
      ]),

      // ─────── SIMPLE COUNT FOR MESSAGES ───────
      Message.countDocuments({
        organizationId: { $in: [organizationId, orgObjectId] },
        createdAt: { $gte: startDate },
      }),
    ]);

    // Extract results from facets
    const conversationResults = conversationFacet[0] || {};
    const analyticsResults = analyticsEventFacet[0] || {};

    const conv = conversationResults.stats?.[0] || {
      totalConversations: 0,
      resolvedConversations: 0,
      escalatedConversations: 0,
    };

    const humanEscalationRate = conv.totalConversations > 0
      ? Math.round((conv.escalatedConversations / conv.totalConversations) * 100)
      : 0;

    const source = { widget: 0, qr: 0, link: 0, email: 0, whatsapp: 0, telegram: 0, web: 0 };
    (conversationResults.sources || []).forEach((row: any) => {
      const rawKey = String(row._id || "unknown").toLowerCase();
      let sourceKey = rawKey;
      if (rawKey.includes("email")) sourceKey = "email";
      else if (rawKey.includes("whatsapp")) sourceKey = "whatsapp";
      else if (rawKey.includes("telegram")) sourceKey = "telegram";

      if (sourceKey in source) {
        source[sourceKey as keyof typeof source] += row.count;
      }
    });

    const ai = analyticsResults.aiCosts?.[0] || {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      estimatedCostUsd: 0,
    };

    return {
      totalMessages,
      totalConversations: conv.totalConversations,
      resolvedConversations: conv.resolvedConversations,
      totalUsersServed: conversationResults.usersServed?.[0]?.totalUsersServed || 0,
      humanEscalationRate,
      avgResolutionTimeMs: conversationResults.resolution?.[0]?.avgResolutionTimeMs
        ? Math.round(conversationResults.resolution[0].avgResolutionTimeMs)
        : null,
      widgetLoads: analyticsResults.widgetLoads?.[0]?.widgetLoads || 0,
      mostAskedQuestions: (conversationResults.questions || []).map((q: any) => ({
        question: q._id,
        count: q.count,
      })),
      source,
      aiCost: {
        promptTokens: ai.promptTokens,
        completionTokens: ai.completionTokens,
        totalTokens: ai.totalTokens,
        estimatedCostUsd: Number(ai.estimatedCostUsd || 0),
      },
    };
  }

  static async getOwnerTrends(organizationId: string, days = 7) {
    const cacheKey = CACHE_KEYS.ownerTrends(organizationId, days);

    // Try Redis cache first
    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        logger.debug("Analytics trends cache hit", { organizationId, days });
        return JSON.parse(cached);
      }
    } catch (error) {
      logger.warn("Redis cache read failed, proceeding with query", { error });
    }

    // Cache miss - compute result
    const result = await this._computeOwnerTrends(organizationId, days);

    // Store in Redis
    try {
      await redisClient.setEx(cacheKey, CACHE_TTL.trends, JSON.stringify(result));
    } catch (error) {
      logger.warn("Redis cache write failed", { error });
    }

    return result;
  }

  private static async _computeOwnerTrends(organizationId: string, days: number) {
    const startDate = dayjs().subtract(days - 1, "days").startOf("day").toDate();
    const endDate = dayjs().endOf("day").toDate();
    const orgObjectId = new mongoose.Types.ObjectId(organizationId);

    const [messageRows, conversationRows, aiCostRows] = await Promise.all([
      Message.aggregate([
        {
          $match: {
            organizationId: { $in: [organizationId, orgObjectId] },
            createdAt: { $gte: startDate, $lte: endDate },
            "metadata.source": { $in: ["ai", "web", "agent", "widget"] },
          },
        },
        {
          $project: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            category: {
              $cond: [
                { $eq: ["$metadata.source", "ai"] },
                "ai",
                { $cond: [{ $eq: ["$metadata.source", "agent"] }, "agent", "other"] },
              ],
            },
          },
        },
        {
          $group: {
            _id: {
              date: "$date",
              category: "$category",
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { "_id.date": 1 } },
      ]),
      Conversation.find({
        organizationId: orgObjectId,
        createdAt: { $lte: endDate },
        $or: [
          { createdAt: { $gte: startDate } },
          { closedAt: { $gte: startDate } },
          { "metadata.statusUpdatedAt": { $gte: startDate } },
          { status: { $nin: ["resolved", "closed"] } },
        ],
      })
        .select("createdAt updatedAt closedAt status metadata.statusUpdatedAt")
        .lean(),
      SystemEvent.aggregate([
        {
          $addFields: {
            eventTime: { $ifNull: ["$occurredAt", "$createdAt"] },
          },
        },
        {
          $match: {
            organizationId: { $in: [organizationId, orgObjectId] },
            category: "analytics",
            eventTime: { $gte: startDate },
            eventType: { $in: ["ai_response", "ai_token_usage"] },
          },
        },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: "%Y-%m-%d", date: "$eventTime" } },
            },
            promptTokens: { $sum: { $ifNull: ["$metadata.promptTokens", 0] } },
            completionTokens: { $sum: { $ifNull: ["$metadata.completionTokens", 0] } },
            totalTokens: {
              $sum: {
                $ifNull: [
                  "$metadata.totalTokens",
                  {
                    $add: [
                      { $ifNull: ["$metadata.promptTokens", 0] },
                      { $ifNull: ["$metadata.completionTokens", 0] },
                    ],
                  },
                ],
              },
            },
            estimatedCostUsd: { $sum: { $ifNull: ["$metadata.estimatedCostUsd", 0] } },
          },
        },
        { $sort: { "_id.date": 1 } },
      ]),
    ]);

    const dates: string[] = [];
    let cursor = dayjs(startDate);
    while (cursor.isSameOrBefore(endDate, "day")) {
      dates.push(cursor.format("YYYY-MM-DD"));
      cursor = cursor.add(1, "day");
    }

    const conversationStatus = dates.map((date) => ({ date, started: 0, resolved: 0, opened: 0 }));
    const messageVolume = dates.map((date) => ({ date, ai: 0, agent: 0 }));
    const aiCost = dates.map((date) => ({ date, promptTokens: 0, completionTokens: 0, totalTokens: 0, estimatedCostUsd: 0 }));

    const statusByDate = new Map(conversationStatus.map((row) => [row.date, row]));
    const messageByDate = new Map(messageVolume.map((row) => [row.date, row]));
    const costByDate = new Map(aiCost.map((row) => [row.date, row]));

    messageRows.forEach((row) => {
      const date = row._id.date as string;
      const category = row._id.category as string;
      const count = row.count as number;

      const target = messageByDate.get(date);
      if (target && (category === "ai" || category === "agent")) {
        target[category] += count;
      }
    });

    const dayEndByDate = new Map(
      dates.map((date) => [date, dayjs(date).endOf("day")]),
    );

    conversationRows.forEach((conversation: ConversationTrendRecord) => {
      const createdAt = dayjs(conversation.createdAt);
      const createdDate = createdAt.format("YYYY-MM-DD");
      const startedTarget = statusByDate.get(createdDate);
      if (startedTarget) startedTarget.started += 1;

      const isResolved = conversation.status === "resolved" || conversation.status === "closed";
      const resolvedAt = isResolved
        ? dayjs(
            conversation.closedAt ||
              conversation.metadata?.statusUpdatedAt ||
              conversation.updatedAt,
          )
        : null;
      const resolvedDate = resolvedAt?.format("YYYY-MM-DD");
      const resolvedTarget = resolvedDate ? statusByDate.get(resolvedDate) : undefined;
      if (resolvedTarget) resolvedTarget.resolved += 1;

      dates.forEach((date) => {
        const dayEnd = dayEndByDate.get(date);
        if (!dayEnd || createdAt.isAfter(dayEnd)) return;
        if (resolvedAt && resolvedAt.isSameOrBefore(dayEnd)) return;
        const target = statusByDate.get(date);
        if (target) target.opened += 1;
      });
    });

    aiCostRows.forEach((row) => {
      const date = row._id.date as string;
      const target = costByDate.get(date);
      if (!target) return;

      target.promptTokens += row.promptTokens || 0;
      target.completionTokens += row.completionTokens || 0;
      target.totalTokens += row.totalTokens || 0;
      target.estimatedCostUsd += row.estimatedCostUsd || 0;
    });

    return {
      conversationStatus,
      messageVolume,
      aiCost,
    };
  }

  /**
   * Invalidate analytics cache when data changes
   * Call this from message/conversation services when updates occur
   */
  static async invalidateCache(organizationId: string) {
    try {
      // Delete all analytics caches for this organization
      const pattern = `analytics:owner:*:${organizationId}:*`;
      for await (const key of redisClient.scanIterator({ MATCH: pattern, COUNT: 100 })) {
        await redisClient.del(key);
      }
      logger.debug("Analytics cache invalidated", { organizationId });
    } catch (error) {
      logger.warn("Failed to invalidate analytics cache", { error });
    }
  }

}
