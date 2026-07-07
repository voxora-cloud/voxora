import { SystemEvent, Conversation, Message, Membership } from "@shared/models";
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
  summary: (orgId: string, days: number, agentId?: string) =>
    `analytics:${agentId ? `agent-${agentId}` : "organization"}:summary:${orgId}:${days}d`,
  trends: (orgId: string, days: number, agentId?: string) =>
    `analytics:${agentId ? `agent-${agentId}` : "organization"}:trends:${orgId}:${days}d`,
};

export class AnalyticsService {
  static async getAgentStats(userId: string, organizationId: string) {
    const membership = await Membership.findOne({ userId, organizationId });
    if (!membership) return null;

    const orgObjectId = new mongoose.Types.ObjectId(organizationId);
    const agentObjectId = new mongoose.Types.ObjectId(userId);
    const todayStart = dayjs().startOf("day");
    const fourteenDaysAgo = dayjs().subtract(13, "days").startOf("day");

    const [conversations, recentConversations, summary, trends] = await Promise.all([
      Conversation.find({ organizationId: orgObjectId, assignedTo: agentObjectId })
        .select("_id status createdAt updatedAt closedAt")
        .lean(),
      Conversation.find({ organizationId: orgObjectId, assignedTo: agentObjectId })
        .select("subject status priority updatedAt")
        .sort({ updatedAt: -1 })
        .limit(5),
      this.getOwnerSummary(organizationId, 30, userId),
      this.getOwnerTrends(organizationId, 7, userId),
    ]);

    const conversationIds = conversations.map((conversation) => conversation._id);
    const messages = conversationIds.length
      ? await Message.find({
          organizationId: orgObjectId,
          conversationId: { $in: conversationIds },
          createdAt: { $gte: fourteenDaysAgo.toDate() },
        })
          .select("conversationId metadata.source createdAt")
          .sort({ createdAt: 1 })
          .lean()
      : [];

    const activeConversationIds = new Set(
      conversations
        .filter((conversation) => conversation.status === "open")
        .map((conversation) => conversation._id.toString()),
    );
    const latestSourceByConversation = new Map<string, string>();
    const agentConversationDays = new Map<string, Set<string>>();
    const agentMessagesByDay = new Map<string, number>();
    const responseTimesByDay = new Map<string, number[]>();
    const pendingCustomerMessageAt = new Map<string, dayjs.Dayjs>();
    const customerSources = new Set(["widget", "web", "email", "whatsapp", "telegram", "link", "qr"]);
    const isCustomerSource = (source: string) =>
      customerSources.has(source) ||
      customerSources.has(source.replace(/_channel$/, ""));

    messages.forEach((message) => {
      const conversationId = message.conversationId.toString();
      const source = message.metadata?.source || "";
      const createdAt = dayjs(message.createdAt);
      const date = createdAt.format("YYYY-MM-DD");

      latestSourceByConversation.set(conversationId, source);

      if (isCustomerSource(source) && !pendingCustomerMessageAt.has(conversationId)) {
        pendingCustomerMessageAt.set(conversationId, createdAt);
      }

      if (source !== "agent") return;

      const conversationsForDay = agentConversationDays.get(date) || new Set<string>();
      conversationsForDay.add(conversationId);
      agentConversationDays.set(date, conversationsForDay);
      agentMessagesByDay.set(date, (agentMessagesByDay.get(date) || 0) + 1);

      const pendingAt = pendingCustomerMessageAt.get(conversationId);
      if (pendingAt) {
        const responseMs = createdAt.diff(pendingAt);
        if (responseMs >= 0) {
          const responseTimes = responseTimesByDay.get(date) || [];
          responseTimes.push(responseMs);
          responseTimesByDay.set(date, responseTimes);
        }
        pendingCustomerMessageAt.delete(conversationId);
      }
    });

    const waitingForAgent = [...activeConversationIds].filter((conversationId) =>
      isCustomerSource(latestSourceByConversation.get(conversationId) || ""),
    ).length;

    const activity = trends.messageVolume.map((row: { date: string }) => ({
      day: dayjs(row.date).format("ddd"),
      conversations: agentConversationDays.get(row.date)?.size || 0,
      messages: agentMessagesByDay.get(row.date) || 0,
    }));
    const responseTime = trends.messageVolume.map((row: { date: string }) => {
      const values = responseTimesByDay.get(row.date) || [];
      const averageMs = values.length
        ? values.reduce((sum, value) => sum + value, 0) / values.length
        : 0;
      return {
        hour: dayjs(row.date).format("ddd"),
        responseTime: Number((averageMs / 60000).toFixed(1)),
      };
    });

    const allResponseTimes = [...responseTimesByDay.values()].flat();
    const avgResponseTimeMs = allResponseTimes.length
      ? Math.round(
          allResponseTimes.reduce((sum, value) => sum + value, 0) /
            allResponseTimes.length,
        )
      : null;

    const currentWeekStart = dayjs().subtract(6, "days").startOf("day");
    const previousWeekStart = dayjs().subtract(13, "days").startOf("day");
    const currentWeekConversationIds = new Set<string>();
    const previousWeekConversationIds = new Set<string>();
    let currentWeekMessages = 0;
    let previousWeekMessages = 0;

    agentConversationDays.forEach((ids, date) => {
      const day = dayjs(date);
      if (day.isSame(currentWeekStart, "day") || day.isAfter(currentWeekStart)) {
        ids.forEach((id) => currentWeekConversationIds.add(id));
      } else if (day.isSame(previousWeekStart, "day") || day.isAfter(previousWeekStart)) {
        ids.forEach((id) => previousWeekConversationIds.add(id));
      }
    });
    agentMessagesByDay.forEach((count, date) => {
      const day = dayjs(date);
      if (day.isSame(currentWeekStart, "day") || day.isAfter(currentWeekStart)) {
        currentWeekMessages += count;
      } else if (day.isSame(previousWeekStart, "day") || day.isAfter(previousWeekStart)) {
        previousWeekMessages += count;
      }
    });

    const closedInRange = (start: dayjs.Dayjs, end?: dayjs.Dayjs) =>
      conversations.filter((conversation) => {
        if (!["resolved", "closed"].includes(conversation.status)) return false;
        const closedAt = dayjs(conversation.closedAt || conversation.updatedAt);
        return (
          (closedAt.isSame(start, "day") || closedAt.isAfter(start)) &&
          (!end || closedAt.isBefore(end))
        );
      }).length;

    const resolvedHandledConversations = (
      conversationIds: Set<string>,
      start: dayjs.Dayjs,
      end?: dayjs.Dayjs,
    ) =>
      conversations.filter((conversation) => {
        if (
          !conversationIds.has(conversation._id.toString()) ||
          !["resolved", "closed"].includes(conversation.status)
        ) {
          return false;
        }

        const closedAt = dayjs(conversation.closedAt || conversation.updatedAt);
        return (
          (closedAt.isSame(start, "day") || closedAt.isAfter(start)) &&
          (!end || closedAt.isBefore(end))
        );
      }).length;

    const currentWeekResolved = resolvedHandledConversations(
      currentWeekConversationIds,
      currentWeekStart,
    );
    const previousWeekResolved = resolvedHandledConversations(
      previousWeekConversationIds,
      previousWeekStart,
      currentWeekStart,
    );
    const resolutionRate = currentWeekConversationIds.size
      ? Math.round((currentWeekResolved / currentWeekConversationIds.size) * 100)
      : 0;
    const previousResolutionRate = previousWeekConversationIds.size
      ? Math.round((previousWeekResolved / previousWeekConversationIds.size) * 100)
      : 0;

    const percentageChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    const today = todayStart.format("YYYY-MM-DD");
    const yesterday = todayStart.subtract(1, "day").format("YYYY-MM-DD");
    const resolvedToday = closedInRange(todayStart);
    const handledToday = agentConversationDays.get(today)?.size || 0;
    const messagesSentToday = agentMessagesByDay.get(today) || 0;
    const activeConversations = activeConversationIds.size;

    return {
      overview: {
        totalConversations: conversations.length,
        activeConversations,
        waitingForAgent,
        resolvedToday,
        handledToday,
        messagesSentToday,
        avgResponseTimeMs,
        avgResolutionTimeMs: summary.avgResolutionTimeMs,
        changes: {
          resolvedToday:
            resolvedToday - closedInRange(todayStart.subtract(1, "day"), todayStart),
          handledToday:
            handledToday - (agentConversationDays.get(yesterday)?.size || 0),
          messagesSentToday:
            messagesSentToday - (agentMessagesByDay.get(yesterday) || 0),
        },
      },
      activity,
      responseTime,
      conversationBreakdown: [
        { status: "Active", count: activeConversations },
        { status: "Waiting", count: waitingForAgent },
        {
          status: "Closed",
          count: conversations.filter((conversation) =>
            ["resolved", "closed"].includes(conversation.status),
          ).length,
        },
      ],
      weekSummary: {
        conversationsHandled: currentWeekConversationIds.size,
        conversationsChange: percentageChange(
          currentWeekConversationIds.size,
          previousWeekConversationIds.size,
        ),
        messagesSent: currentWeekMessages,
        messagesChange: percentageChange(currentWeekMessages, previousWeekMessages),
        resolutionRate,
        resolutionRateChange: resolutionRate - previousResolutionRate,
      },
      recentConversations,
    };
  }

  static async getOwnerSummary(organizationId: string, days = 30, agentId?: string) {
    const cacheKey = CACHE_KEYS.summary(organizationId, days, agentId);

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
    const result = await this._computeOwnerSummary(organizationId, days, agentId);

    // Store in Redis
    try {
      await redisClient.setEx(cacheKey, CACHE_TTL.summary, JSON.stringify(result));
    } catch (error) {
      logger.warn("Redis cache write failed", { error });
    }

    return result;
  }

  private static async _computeOwnerSummary(
    organizationId: string,
    days: number,
    agentId?: string,
  ) {
    const startDate = dayjs().subtract(days - 1, "days").startOf("day").toDate();
    const orgObjectId = new mongoose.Types.ObjectId(organizationId);
    const agentObjectId = agentId ? new mongoose.Types.ObjectId(agentId) : undefined;
    const conversationMatch = {
      organizationId: orgObjectId,
      createdAt: { $gte: startDate },
      ...(agentObjectId ? { assignedTo: agentObjectId } : {}),
    };
    const scopedConversationIds = agentObjectId
      ? await Conversation.distinct("_id", {
          organizationId: orgObjectId,
          assignedTo: agentObjectId,
        })
      : undefined;
    const scopedConversationIdStrings = scopedConversationIds?.map(String);
    const analyticsScope = agentId
      ? {
          $or: [
            { conversationId: { $in: scopedConversationIdStrings } },
            { agentId },
          ],
        }
      : {};

    // Single $facet pipeline for all Conversation aggregations
    const [conversationFacet, analyticsEventFacet, totalMessages] = await Promise.all([
      // ─────── SINGLE FACET FOR CONVERSATION QUERIES ───────
      Conversation.aggregate([
        {
          $match: conversationMatch,
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
            ...analyticsScope,
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
        ...(scopedConversationIds
          ? { conversationId: { $in: scopedConversationIds } }
          : {}),
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

  static async getOwnerTrends(organizationId: string, days = 7, agentId?: string) {
    const cacheKey = CACHE_KEYS.trends(organizationId, days, agentId);

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
    const result = await this._computeOwnerTrends(organizationId, days, agentId);

    // Store in Redis
    try {
      await redisClient.setEx(cacheKey, CACHE_TTL.trends, JSON.stringify(result));
    } catch (error) {
      logger.warn("Redis cache write failed", { error });
    }

    return result;
  }

  private static async _computeOwnerTrends(
    organizationId: string,
    days: number,
    agentId?: string,
  ) {
    const startDate = dayjs().subtract(days - 1, "days").startOf("day").toDate();
    const endDate = dayjs().endOf("day").toDate();
    const orgObjectId = new mongoose.Types.ObjectId(organizationId);
    const agentObjectId = agentId ? new mongoose.Types.ObjectId(agentId) : undefined;
    const scopedConversationIds = agentObjectId
      ? await Conversation.distinct("_id", {
          organizationId: orgObjectId,
          assignedTo: agentObjectId,
        })
      : undefined;
    const scopedConversationIdStrings = scopedConversationIds?.map(String);
    const analyticsScope = agentId
      ? {
          $or: [
            { conversationId: { $in: scopedConversationIdStrings } },
            { agentId },
          ],
        }
      : {};

    const [messageRows, conversationRows, aiCostRows] = await Promise.all([
      Message.aggregate([
        {
          $match: {
            organizationId: { $in: [organizationId, orgObjectId] },
            createdAt: { $gte: startDate, $lte: endDate },
            "metadata.source": { $in: ["ai", "web", "agent", "widget"] },
            ...(scopedConversationIds
              ? { conversationId: { $in: scopedConversationIds } }
              : {}),
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
        ...(agentObjectId ? { assignedTo: agentObjectId } : {}),
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
            ...analyticsScope,
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
      const pattern = `analytics:*:*:${organizationId}:*`;
      for await (const key of redisClient.scanIterator({ MATCH: pattern, COUNT: 100 })) {
        await redisClient.del(key);
      }
      logger.debug("Analytics cache invalidated", { organizationId });
    } catch (error) {
      logger.warn("Failed to invalidate analytics cache", { error });
    }
  }

}
