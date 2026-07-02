import { Types } from "mongoose";
import { Conversation, Message, User, Membership, SystemEvent } from "@shared/models";
import logger from "@shared/core/logger";
import { ListConversationsOptions, UpdateVisitorInfoInput, RouteConversationInput } from "./conversation.types";

export class ConversationService {

  /**
   * Get all conversations for an organization (filtered by status/agent)
   */
  async getConversations(organizationId: string, options: ListConversationsOptions) {
    const { status, limit = 50, offset = 0, assignedTo } = options;

    const filter: any = { organizationId };

    if (assignedTo === null) {
      // Specifically requesting unassigned conversations (In Queue)
      filter.assignedTo = null;
      filter.$or = [
        { "metadata.escalatedAt": { $ne: null } },
        { "metadata.pendingEscalation": true },
      ];
    } else if (assignedTo) {
      // Specifically requesting conversations for a certain agent
      filter.assignedTo = assignedTo;
    } else {
      // General view (All Open) - show assigned OR escalated
      filter.$or = [
        { assignedTo: { $ne: null } },
        { "metadata.escalatedAt": { $ne: null } },
        { "metadata.pendingEscalation": true },
      ];
    }

    if (status && status !== "all") filter.status = status;

    const conversations = await Conversation.find(filter)
      .sort({ updatedAt: -1 })
      .limit(Number(limit))
      .skip(Number(offset))
      .lean();

    const conversationIds = conversations.map((c) => c._id);
    const orgIdObj = new Types.ObjectId(organizationId);

    const [latestMessages, unreadCounts] = await Promise.all([
      Message.aggregate([
        {
          $match: {
            conversationId: { $in: conversationIds },
            organizationId: orgIdObj,
          },
        },
        {
          $sort: { conversationId: 1, createdAt: -1 },
        },
        {
          $group: {
            _id: "$conversationId",
            message: { $first: "$$ROOT" },
          },
        },
      ]),
      Message.aggregate([
        {
          $match: {
            conversationId: { $in: conversationIds },
            organizationId: orgIdObj,
            "metadata.source": "widget",
          },
        },
        {
          $group: {
            _id: "$conversationId",
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const latestMessagesMap = new Map<string, any>(
      latestMessages.map((item) => [item._id.toString(), item.message]),
    );

    const unreadCountsMap = new Map<string, number>(
      unreadCounts.map((item) => [item._id.toString(), item.count]),
    );

    const conversationsWithMeta = conversations.map((conv) => {
      const convIdStr = conv._id.toString();
      const lastMessage = latestMessagesMap.get(convIdStr) || null;
      const unreadCount = unreadCountsMap.get(convIdStr) || 0;
      return {
        ...conv,
        lastMessage,
        unreadCount,
        lastMessageAt: lastMessage?.createdAt || conv.updatedAt,
      };
    });

    return { conversations: conversationsWithMeta, total: conversations.length };
  }

  /**
   * Get a specific conversation with all messages (validates org ownership)
   */
  async getConversationById(organizationId: string, conversationId: string) {
    const conversation = await Conversation.findOne({ _id: conversationId, organizationId }).lean();
    if (!conversation) return null;

    const messages = await Message.find({ conversationId, organizationId }).sort({ createdAt: 1 }).lean();
    return { conversation, messages };
  }



  async updateVisitorInfo(
    organizationId: string,
    conversationId: string,
    data: UpdateVisitorInfoInput,
    existingSessionId?: string,
  ) {
    const { name, email, sessionId } = data;
    const conversation = await Conversation.findOne({ _id: conversationId, organizationId });
    if (!conversation) return { found: false };
    if (sessionId && conversation.visitor?.sessionId !== sessionId) return { found: true, validSession: false };

    const updateData: any = {};
    if (name) updateData["visitor.name"] = name;
    if (email) updateData["visitor.email"] = email;
    if (name && email) {
      updateData["visitor.isAnonymous"] = false;
      updateData["visitor.providedInfoAt"] = new Date();
    }

    await Conversation.findByIdAndUpdate(conversationId, { $set: updateData }, { new: true });
    await Message.updateMany(
      { conversationId, organizationId, "metadata.source": "widget" },
      { $set: { "metadata.senderName": name || conversation.visitor?.name, "metadata.senderEmail": email || conversation.visitor?.email } },
    );

    return { found: true, validSession: true };
  }

  /**
   * Auto-assign conversation to a team/agent within the org.
   * Priority: online agents -> online admins -> null (no one online).
   */
  async autoAssignConversation(organizationId: string): Promise<{ agentId: string | null }> {
    try {
      const onlineStatuses = ["online", "away"];
      const baseFilter = { organizationId, inviteStatus: "active" as const };

      const pickLeastBusy = async (memberships: any[]): Promise<string | null> => {
        const online = memberships.filter(
          (m) => (m.userId as any)?.isActive && onlineStatuses.includes((m.userId as any)?.status),
        );
        if (online.length === 0) return null;
        const withLoad = await Promise.all(
          online.map(async (m) => {
            const userId = (m.userId as any)._id;
            const load = await Conversation.countDocuments({ organizationId, assignedTo: userId, status: { $in: ["open", "pending"] } });
            return { agentId: userId.toString(), load };
          }),
        );
        withLoad.sort((a, b) => a.load - b.load);
        return withLoad[0].agentId;
      };

      // 1. Try agents first
      const agentMembers = await Membership.find({ ...baseFilter, role: "agent" }).populate("userId", "name email status isActive");
      const agentId = await pickLeastBusy(agentMembers);
      if (agentId) return { agentId };

      // 2. No agents online — try admins
      const adminMembers = await Membership.find({ ...baseFilter, role: "admin" }).populate("userId", "name email status isActive");
      const adminId = await pickLeastBusy(adminMembers);
      if (adminId) return { agentId: adminId };

      // 3. No admins online — try owners
      const ownerMembers = await Membership.find({ ...baseFilter, role: "owner" }).populate("userId", "name email status isActive");
      const ownerId = await pickLeastBusy(ownerMembers);
      if (ownerId) return { agentId: ownerId };

      logger.warn(`[AutoAssign] No online members for org ${organizationId} — skipping assignment`);
      return { agentId: null };
    } catch (error: any) {
      logger.error(`Error in auto-assignment: ${error.message}`);
      return { agentId: null };
    }
  }

  async routeConversation(
    organizationId: string,
    conversationId: string,
    data: RouteConversationInput,
    routedBy: string,
  ) {
    const { agentId, reason } = data;
    const conversation = await Conversation.findOne({ _id: conversationId, organizationId });
    if (!conversation) return { found: false };

    const agent = await User.findById(agentId).select("name email");

    const updatedConversation = await Conversation.findByIdAndUpdate(
      conversationId,
      {
        $set: {
          assignedTo: agentId,
          "metadata.routedBy": routedBy,
          "metadata.routedAt": new Date(),
          "metadata.routeReason": reason || "Manual routing",
          "metadata.escalatedAt": new Date(),
          "metadata.escalationReason": reason || "Manual routing",
          "metadata.pendingEscalation": false,
        },
        $addToSet: { participants: agentId },
      },
      { new: true },
    ).populate("assignedTo", "name email");

    return { found: true, noAgent: false, agentNotFound: false, updatedConversation, selectedAgentId: agentId, agentName: agent?.name, agentEmail: (agent as any)?.email, originalConversation: conversation };
  }

  async updateConversationStatus(organizationId: string, conversationId: string, status: string, updatedBy: string) {
    const validStatuses = ["open", "pending", "closed", "resolved"];
    if (!validStatuses.includes(status)) return { valid: false };

    const conversation = await Conversation.findOneAndUpdate(
      { _id: conversationId, organizationId },
      { $set: { status, "metadata.statusUpdatedBy": updatedBy, "metadata.statusUpdatedAt": new Date() } },
      { new: true },
    );

    if (!conversation) return { valid: true, found: false };
    return { valid: true, found: true, conversation };
  }

  /**
   * Returns the minimal gate fields the AI service needs to check
   * whether it should still process a conversation (is it escalated / assigned?).
   * Used by the AI conversation.cache instead of a direct DB call.
   */
  async getConversationGate(organizationId: string, conversationId: string) {
    const conv = await Conversation.findOne(
      { _id: conversationId, organizationId },
      { status: 1, assignedTo: 1, "metadata.escalatedAt": 1, "metadata.humanJoinedAt": 1 },
    ).lean();

    if (!conv) return null;

    return {
      status: conv.status,
      assignedTo: conv.assignedTo?.toString() || null,
      metadata: {
        escalatedAt: conv.metadata?.escalatedAt
          ? new Date(conv.metadata.escalatedAt).toISOString()
          : null,
        humanJoinedAt: conv.metadata?.humanJoinedAt
          ? new Date(conv.metadata.humanJoinedAt).toISOString()
          : null,
      },
    };
  }

  /**
   * Pushes a resolution entry to the conversation's metadata.resolvedQueries array.
   * Called by the AI mark_query_resolved tool via API instead of a direct DB write.
   */
  async markQueryResolved(
    organizationId: string,
    conversationId: string,
    resolutionEntry: Record<string, unknown>,
  ) {
    const resolvedAt = resolutionEntry.resolvedAt ? new Date(resolutionEntry.resolvedAt as string) : new Date();

    const result = await Conversation.updateOne(
      { _id: conversationId, organizationId },
      {
        $push: { "metadata.resolvedQueries": resolutionEntry },
        $set: {
          "metadata.lastResolvedAt": resolvedAt,
          "metadata.lastResolvedBy": "ai_tool",
        },
      },
    );

    return result.matchedCount > 0;
  }

  /**
   * Fetch recent conversation messages and visitor info for AI memory context.
   */
  async getConversationMemory(organizationId: string, conversationId: string, limit = 10) {
    const [messages, conversation] = await Promise.all([
      Message.find({ conversationId, organizationId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean(),
      Conversation.findOne({ _id: conversationId, organizationId })
        .select("visitor.name visitor.email")
        .lean(),
    ]);

    const memory = messages.reverse().map((m) => ({
      role: m.metadata?.source === "widget" ? "user" : "assistant",
      content: m.content,
      senderName: m.metadata?.senderName || null,
      timestamp: m.createdAt,
    }));

    const visitorName = conversation?.visitor?.name && conversation.visitor.name !== "Anonymous User"
      ? conversation.visitor.name
      : null;
    const visitorEmail = conversation?.visitor?.email && conversation.visitor.email !== "anonymous@temp.local"
      ? conversation.visitor.email
      : null;

    return { memory, visitor: { name: visitorName, email: visitorEmail } };
  }

  /**
   * Save a record of an AI agent run / execution.
   */
  async createAgentRun(payload: {
    organizationId: string;
    conversationId: string;
    messageId: string;
    steps: any[];
    duration: number;
    status: "success" | "failed";
    error?: string;
    usage?: any;
  }) {
    return SystemEvent.create({
      organizationId: payload.organizationId,
      category: "agent_execution",
      eventType: "agent_run",
      conversationId: payload.conversationId,
      messageId: payload.messageId,
      latencyMs: payload.duration,
      success: payload.status === "success",
      error: payload.error,
      tokens: payload.usage ? {
        prompt: payload.usage.promptTokens,
        completion: payload.usage.completionTokens,
        total: payload.usage.totalTokens,
      } : undefined,
      metadata: {
        steps: payload.steps,
      },
    });
  }

  /**
   * Retrieve all agent run logs for a specific conversation.
   */
  async getAgentRuns(organizationId: string, conversationId: string) {
    const events = await SystemEvent.find({
      organizationId,
      conversationId,
      category: "agent_execution",
      eventType: "agent_run",
    })
      .sort({ createdAt: -1 })
      .lean();

    return events.map((e) => ({
      _id: e._id,
      organizationId: e.organizationId,
      conversationId: e.conversationId,
      messageId: e.messageId,
      steps: e.metadata?.steps || [],
      duration: e.latencyMs || 0,
      status: e.success ? "success" : "failed",
      error: e.error,
      usage: e.tokens ? {
        promptTokens: e.tokens.prompt,
        completionTokens: e.tokens.completion,
        totalTokens: e.tokens.total,
      } : undefined,
      createdAt: e.createdAt,
      updatedAt: e.createdAt,
    }));
  }
}
