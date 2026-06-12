import { Conversation, Message, User, Membership } from "@shared/models";
import logger from "@shared/core/logger";

export class ConversationService {

  /**
   * Get all conversations for an organization (filtered by status/agent)
   */
  async getConversations(organizationId: string, options: {
    status?: string;
    limit?: number;
    offset?: number;
    assignedTo?: string | null;
  }) {
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

    const conversationsWithMeta = await Promise.all(
      conversations.map(async (conv) => {
        const [lastMessage, unreadCount] = await Promise.all([
          Message.findOne({ conversationId: conv._id, organizationId }).sort({ createdAt: -1 }).lean(),
          Message.countDocuments({ conversationId: conv._id, organizationId, "metadata.source": "widget" }),
        ]);
        return { ...conv, lastMessage, unreadCount, lastMessageAt: lastMessage?.createdAt || conv.updatedAt };
      }),
    );

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

  async patchConversationStatus(organizationId: string, conversationId: string, status: string) {
    return Conversation.findOneAndUpdate(
      { _id: conversationId, organizationId },
      { status, updatedAt: new Date() },
      { new: true },
    );
  }

  async updateVisitorInfo(
    organizationId: string,
    conversationId: string,
    data: { name?: string; email?: string; sessionId?: string },
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
    data: { agentId?: string; reason?: string },
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
}
