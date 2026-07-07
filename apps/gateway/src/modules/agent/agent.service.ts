import mongoose from "mongoose";
import { Membership, Conversation, Message } from "@shared/models";
import { User } from "@shared/models";
import logger from "@shared/core/logger";
import { UpdateAgentProfileInput } from "./agent.types";
import { AnalyticsService } from "@modules/analytics/analytics.service";
import dayjs from "dayjs";

export class AgentService {
  // ═══════════════════════════════════════════════════
  //  AGENT PROFILE
  // ═══════════════════════════════════════════════════

  async getAgentProfile(userId: string, organizationId: string) {
    const membership = await Membership.findOne({ userId, organizationId })
      .populate("userId", "name email status lastSeen isActive emailVerified");
    return membership;
  }

  async updateAgentProfile(userId: string, updateData: UpdateAgentProfileInput) {
    const updates: any = {};
    if (updateData.name) updates.name = updateData.name;
    if (updateData.phoneNumber) updates.phoneNumber = updateData.phoneNumber;

    const agent = await User.findByIdAndUpdate(userId, updates, {
      new: true,
      runValidators: true,
    }).select("-password");

    if (agent) logger.info("Agent profile updated", { agentId: agent._id, updates });
    return agent;
  }

  async updateAgentStatus(userId: string, status: string) {
    const agent = await User.findByIdAndUpdate(
      userId,
      { status, lastSeen: new Date() },
      { new: true },
    ).select("name email status lastSeen");

    if (agent) logger.info("Agent status updated", { agentId: agent._id, status });
    return agent ? { status: agent.status, lastSeen: agent.lastSeen } : null;
  }

  // ═══════════════════════════════════════════════════
  //  AGENT STATS (org-scoped)
  // ═══════════════════════════════════════════════════

  async getAgentStats(userId: string, organizationId: string) {
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
      AnalyticsService.getOwnerSummary(organizationId, 30, userId),
      AnalyticsService.getOwnerTrends(organizationId, 7, userId),
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
}
