import { Conversation, Message, Team, User, Membership } from "@shared/models";
import logger from "@shared/utils/logger";

export class ConversationService {

  /**
   * Get all conversations for an organization (filtered by status/agent)
   */
  async getConversations(organizationId: string, options: {
    status?: string;
    limit?: number;
    offset?: number;
    assignedTo?: string;
  }) {
    const { status, limit = 50, offset = 0, assignedTo } = options;

    const filter: any = { organizationId };
    if (assignedTo) filter.assignedTo = assignedTo;
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
   * Find available agent from a specific team (org-scoped, least-busy)
   */
  async findAvailableAgent(organizationId: string, teamId: string): Promise<string | null> {
    try {
      const agentMemberships = await Membership.find({
        organizationId,
        teams: teamId,
        inviteStatus: "active",
      }).populate("userId", "status isActive");

      const available = agentMemberships.filter((m) => {
        const user = m.userId as any;
        return user?.isActive && ["online", "away"].includes(user?.status);
      });

      if (available.length === 0) {
        logger.warn(`No available agents found in team ${teamId}`);
        return null;
      }

      const agentLoads = await Promise.all(
        available.map(async (m) => {
          const userId = (m.userId as any)._id;
          const load = await Conversation.countDocuments({
            organizationId,
            assignedTo: userId,
            status: { $in: ["open", "pending"] },
          });
          return { agentId: userId.toString(), load, status: (m.userId as any).status };
        }),
      );

      agentLoads.sort((a, b) => {
        if (a.status === "online" && b.status !== "online") return -1;
        if (a.status !== "online" && b.status === "online") return 1;
        return a.load - b.load;
      });

      return agentLoads[0].agentId;
    } catch (error: any) {
      logger.error(`Error finding available agent: ${error.message}`);
      return null;
    }
  }

  /**
   * Auto-assign conversation to a team/agent within the org.
   * Priority: online agents -> online admins -> null (no one online).
   */
  async autoAssignConversation(organizationId: string): Promise<{ teamId: string | null; agentId: string | null }> {
    try {
      const onlineStatuses = ["online", "away"];
      const baseFilter = { organizationId, inviteStatus: "active" as const };

      // Helper: pick least-busy online member from a membership list
      const pickLeastBusy = async (memberships: any[]): Promise<string | null> => {
        const online = memberships.filter(
          (m) => (m.userId as any)?.isActive && onlineStatuses.includes((m.userId as any)?.status),
        );
        if (online.length === 0) return null;
        const withLoad = await Promise.all(
          online.map(async (m) => {
            const userId = (m.userId as any)._id;
            const load = await Conversation.countDocuments({ organizationId, assignedTo: userId, status: { $in: ["open", "pending"] } });
            return { agentId: userId.toString(), load, status: (m.userId as any).status };
          }),
        );
        withLoad.sort((a, b) => {
          if (a.status === "online" && b.status !== "online") return -1;
          if (a.status !== "online" && b.status === "online") return 1;
          return a.load - b.load;
        });
        return withLoad[0].agentId;
      };

      // Get a teamId to attach to the conversation (first active team or null)
      const firstTeam = await Team.findOne({ organizationId, isActive: true }).select("_id").lean();
      const teamId = firstTeam?._id?.toString() || null;

      // 1. Try online agents first
      const agentMembers = await Membership.find({ ...baseFilter, role: "agent" }).populate("userId", "name email status isActive");
      const agentId = await pickLeastBusy(agentMembers);
      if (agentId) return { teamId, agentId };

      // 2. No agents online — try admins
      const adminMembers = await Membership.find({ ...baseFilter, role: "admin" }).populate("userId", "name email status isActive");
      const adminId = await pickLeastBusy(adminMembers);
      if (adminId) return { teamId, agentId: adminId };


      // 4. No one is online — do not assign
      logger.warn(`[AutoAssign] No online members for org ${organizationId} — skipping assignment`);
      return { teamId: null, agentId: null };
    } catch (error: any) {
      logger.error(`Error in auto-assignment: ${error.message}`);
      return { teamId: null, agentId: null };
    }
  }

  async routeConversation(
    organizationId: string,
    conversationId: string,
    data: { teamId?: string; agentId?: string; reason?: string },
    routedBy: string,
  ) {
    const { teamId, agentId, reason } = data;
    const conversation = await Conversation.findOne({ _id: conversationId, organizationId });
    if (!conversation) return { found: false };

    let selectedAgentId = agentId;
    let selectedTeamId = teamId;

    if (teamId && !agentId) {
      const found = await this.findAvailableAgent(organizationId, teamId);
      if (!found) return { found: true, noAgent: true, teamId };
      selectedAgentId = found;
    } else if (agentId && !teamId) {
      const m = await Membership.findOne({ userId: agentId, organizationId }).select("teams");
      selectedTeamId = m?.teams?.[0]?.toString();
    }

    const agent = await User.findById(selectedAgentId).select("name email");
    const team = selectedTeamId ? await Team.findById(selectedTeamId).select("name") : null;

    const updatedConversation = await Conversation.findByIdAndUpdate(
      conversationId,
      {
        $set: {
          assignedTo: selectedAgentId,
          "metadata.teamId": selectedTeamId,
          "metadata.routedBy": routedBy,
          "metadata.routedAt": new Date(),
          "metadata.routeReason": reason || "Manual routing",
          "metadata.escalatedAt": new Date(),
          "metadata.escalationReason": reason || "Manual routing",
          "metadata.pendingEscalation": false,
        },
        $addToSet: { participants: selectedAgentId },
      },
      { new: true },
    ).populate("assignedTo", "name email");

    return { found: true, noAgent: false, agentNotFound: false, updatedConversation, selectedAgentId, selectedTeamId, agentName: agent?.name, agentEmail: (agent as any)?.email, teamName: team?.name, originalConversation: conversation };
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
}
