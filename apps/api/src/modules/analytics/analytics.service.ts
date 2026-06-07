import { AnalyticsEvent, Conversation, Message } from "@shared/models";
import dayjs from "dayjs";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import mongoose from "mongoose";

dayjs.extend(isSameOrBefore);

type ConversationTrendRecord = {
  createdAt: Date;
  updatedAt: Date;
  closedAt?: Date | null;
  status: "open" | "pending" | "resolved" | "closed";
  metadata?: {
    statusUpdatedAt?: Date | string | null;
  };
};

export class AnalyticsService {
  static async getOwnerSummary(organizationId: string, days = 30) {
    const startDate = dayjs().subtract(days - 1, "days").startOf("day").toDate();
    const orgObjectId = new mongoose.Types.ObjectId(organizationId);

    const [conversationAgg, usersServedAgg, resolutionAgg, questionAgg, widgetLoadAgg, sourceAgg, tokenAgg, totalMessages] =
      await Promise.all([
        Conversation.aggregate([
          {
            $match: {
              organizationId: orgObjectId,
              createdAt: { $gte: startDate },
            },
          },
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
        ]),
        Conversation.aggregate([
          {
            $match: {
              organizationId: orgObjectId,
              createdAt: { $gte: startDate },
              "visitor.sessionId": { $exists: true, $ne: "" },
            },
          },
          {
            $group: {
              _id: "$visitor.sessionId",
            },
          },
          { $count: "totalUsersServed" },
        ]),
        Conversation.aggregate([
          {
            $match: {
              organizationId: orgObjectId,
              createdAt: { $gte: startDate },
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
        ]),
        Conversation.aggregate([
          {
            $match: {
              organizationId: orgObjectId,
              createdAt: { $gte: startDate },
              "metadata.customer.initialMessage": { $exists: true, $type: "string", $ne: "" },
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
        ]),
        AnalyticsEvent.aggregate([
          {
            $addFields: {
              eventTime: { $ifNull: ["$occurredAt", "$createdAt"] },
            },
          },
          {
            $match: {
              organizationId: { $in: [organizationId, orgObjectId] },
              type: "widget_load",
              eventTime: { $gte: startDate },
            },
          },
          {
            $count: "widgetLoads",
          },
        ]),
        AnalyticsEvent.aggregate([
          {
            $addFields: {
              eventTime: { $ifNull: ["$occurredAt", "$createdAt"] },
            },
          },
          {
            $match: {
              organizationId: { $in: [organizationId, orgObjectId] },
              eventTime: { $gte: startDate },
              $or: [
                { channel: "widget" },
                { type: "qr_scan" },
              ],
            },
          },
          {
            $project: {
              source: {
                $cond: [{ $eq: ["$type", "qr_scan"] }, "qr", "widget"],
              },
            },
          },
          {
            $group: {
              _id: "$source",
              count: { $sum: 1 },
            },
          },
        ]),
        AnalyticsEvent.aggregate([
          {
            $addFields: {
              eventTime: { $ifNull: ["$occurredAt", "$createdAt"] },
            },
          },
          {
            $match: {
              organizationId: { $in: [organizationId, orgObjectId] },
              eventTime: { $gte: startDate },
              type: { $in: ["ai_response", "ai_token_usage"] },
            },
          },
          {
            $project: {
              promptTokens: { $ifNull: ["$metadata.promptTokens", 0] },
              completionTokens: { $ifNull: ["$metadata.completionTokens", 0] },
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
              estimatedCostUsd: { $ifNull: ["$metadata.estimatedCostUsd", 0] },
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
        ]),
        Message.countDocuments({
          organizationId: { $in: [organizationId, orgObjectId] },
          createdAt: { $gte: startDate },
        }),
      ]);

    const conv = conversationAgg[0] || {
      totalConversations: 0,
      resolvedConversations: 0,
      escalatedConversations: 0,
    };

    const humanEscalationRate = conv.totalConversations > 0
      ? Math.round((conv.escalatedConversations / conv.totalConversations) * 100)
      : 0;

    const source = { widget: 0, qr: 0 };
    sourceAgg.forEach((row) => {
      if (row._id in source) {
        source[row._id as "widget" | "qr"] = row.count;
      }
    });

    const ai = tokenAgg[0] || {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      estimatedCostUsd: 0,
    };

    return {
      totalMessages,
      totalConversations: conv.totalConversations,
      resolvedConversations: conv.resolvedConversations,
      totalUsersServed: usersServedAgg[0]?.totalUsersServed || 0,
      humanEscalationRate,
      avgResolutionTimeMs: resolutionAgg[0]?.avgResolutionTimeMs
        ? Math.round(resolutionAgg[0].avgResolutionTimeMs)
        : null,
      widgetLoads: widgetLoadAgg[0]?.widgetLoads || 0,
      mostAskedQuestions: questionAgg.map((q) => ({ question: q._id, count: q.count })),
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
      AnalyticsEvent.aggregate([
        {
          $addFields: {
            eventTime: { $ifNull: ["$occurredAt", "$createdAt"] },
          },
        },
        {
          $match: {
            organizationId: { $in: [organizationId, orgObjectId] },
            eventTime: { $gte: startDate },
            type: { $in: ["ai_response", "ai_token_usage"] },
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

}
