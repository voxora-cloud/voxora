import { Conversation, Message, Team, User } from "@shared/models";
import logger from "@shared/utils/logger";

export class ConversationService {
  /**
   * Get all conversations optionally filtered by status
   */
  async getConversations(options: {
    status?: string;
    limit?: number;
    offset?: number;
  }) {
    const { status, limit = 50, offset = 0 } = options;

    const filter: any = {};
    if (status && status !== "all") {
      filter.status = status;
    }

    const conversations = await Conversation.find(filter)
      .sort({ updatedAt: -1 })
      .limit(Number(limit))
      .skip(Number(offset))
      .lean();

    const conversationsWithMeta = await Promise.all(
      conversations.map(async (conv) => {
        const lastMessage = await Message.findOne({
          conversationId: conv._id,
        })
          .sort({ createdAt: -1 })
          .lean();

        const unreadCount = await Message.countDocuments({
          conversationId: conv._id,
          "metadata.source": "widget",
        });

        return {
          ...conv,
          lastMessage,
          unreadCount,
          lastMessageAt: lastMessage?.createdAt || conv.updatedAt,
        };
      }),
    );

    return {
      conversations: conversationsWithMeta,
      total: conversations.length,
    };
  }

  /**
   * Get a specific conversation with all messages
   */
  async getConversationById(conversationId: string) {
    const conversation = await Conversation.findById(conversationId).lean();
    if (!conversation) {
      return null;
    }

    const messages = await Message.find({ conversationId })
      .sort({ createdAt: 1 })
      .lean();

    return { conversation, messages };
  }

  /**
   * Update conversation status (simple inline version)
   */
  async patchConversationStatus(
    conversationId: string,
    status: string,
  ) {
    return await Conversation.findByIdAndUpdate(
      conversationId,
      { status, updatedAt: new Date() },
      { new: true },
    );
  }

  /**
   * Update visitor information for a conversation
   */
  async updateVisitorInfo(
    conversationId: string,
    data: { name?: string; email?: string; sessionId?: string },
    existingSessionId?: string,
  ) {
    const { name, email, sessionId } = data;

    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      return { found: false };
    }

    if (sessionId && conversation.visitor?.sessionId !== sessionId) {
      return { found: true, validSession: false };
    }

    const updateData: any = {};
    if (name) updateData["visitor.name"] = name;
    if (email) updateData["visitor.email"] = email;
    if (name && email) {
      updateData["visitor.isAnonymous"] = false;
      updateData["visitor.providedInfoAt"] = new Date();
    }

    await Conversation.findByIdAndUpdate(
      conversationId,
      { $set: updateData },
      { new: true },
    );

    await Message.updateMany(
      {
        conversationId,
        "metadata.source": "widget",
      },
      {
        $set: {
          "metadata.senderName": name || conversation.visitor?.name,
          "metadata.senderEmail": email || conversation.visitor?.email,
        },
      },
    );

    return { found: true, validSession: true };
  }

  /**
   * Find available agent from a specific team
   * Strategy: Find agent with least active conversations
   */
  async findAvailableAgent(teamId: string): Promise<string | null> {
    try {
      const agents = await User.find({
        teams: teamId,
        role: { $in: ["agent", "admin"] },
        isActive: true,
        status: { $in: ["online", "away"] },
      });

      if (agents.length === 0) {
        logger.warn(`No available agents found in team ${teamId}`);
        return null;
      }

      const agentLoads = await Promise.all(
        agents.map(async (agent) => {
          const activeConvs = await Conversation.countDocuments({
            assignedTo: agent._id,
            status: { $in: ["open", "pending"] },
          });
          return { agentId: agent._id, load: activeConvs, status: agent.status };
        }),
      );

      agentLoads.sort((a, b) => {
        if (a.status === "online" && b.status !== "online") return -1;
        if (a.status !== "online" && b.status === "online") return 1;
        return a.load - b.load;
      });

      return agentLoads[0].agentId.toString();
    } catch (error: any) {
      logger.error(`Error finding available agent: ${error.message}`);
      return null;
    }
  }

  /**
   * Auto-assign conversation to team and agent
   * Strategy: Find team with most available agents, then assign to least-busy agent
   */
  async autoAssignConversation(): Promise<{
    teamId: string | null;
    agentId: string | null;
  }> {
    try {
      const teams = await Team.find({ isActive: true });

      if (teams.length === 0) {
        logger.warn("No active teams found for auto-assignment");
        return { teamId: null, agentId: null };
      }

      const teamScores = await Promise.all(
        teams.map(async (team) => {
          const onlineAgents = await User.countDocuments({
            teams: team._id,
            role: { $in: ["agent", "admin"] },
            isActive: true,
            status: "online",
          });

          const awayAgents = await User.countDocuments({
            teams: team._id,
            role: { $in: ["agent", "admin"] },
            isActive: true,
            status: "away",
          });

          const score = onlineAgents * 2 + awayAgents;

          return {
            teamId: team._id.toString(),
            score,
            hasAgents: onlineAgents + awayAgents > 0,
          };
        }),
      );

      const availableTeams = teamScores
        .filter((t: any) => t.hasAgents)
        .sort((a: any, b: any) => b.score - a.score);

      if (availableTeams.length === 0) {
        logger.warn("No teams with available agents found");
        return { teamId: teams[0]._id.toString(), agentId: null };
      }

      const selectedTeam = availableTeams[0];
      const agentId = await this.findAvailableAgent(selectedTeam.teamId);

      logger.info(
        `Auto-assigned conversation to team ${selectedTeam.teamId}, agent ${agentId}`,
      );
      return { teamId: selectedTeam.teamId, agentId };
    } catch (error: any) {
      logger.error(`Error in auto-assignment: ${error.message}`);
      return { teamId: null, agentId: null };
    }
  }

  /**
   * Route conversation to team or agent
   */
  async routeConversation(
    conversationId: string,
    data: { teamId?: string; agentId?: string; reason?: string },
    routedBy: string,
  ) {
    const { teamId, agentId, reason } = data;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return { found: false };
    }

    let selectedAgentId = agentId;
    let selectedTeamId = teamId;

    if (teamId && !agentId) {
      const found = await this.findAvailableAgent(teamId);
      if (!found) {
        return { found: true, noAgent: true, teamId };
      }
      selectedAgentId = found;
      selectedTeamId = teamId;
    } else if (agentId && !teamId) {
      const agent = await User.findById(agentId).select("teams");
      if (!agent) {
        return { found: true, agentNotFound: true };
      }
      selectedTeamId = agent.teams?.[0]?.toString() || undefined;
    }

    const agent = await User.findById(selectedAgentId).select("name email");
    const team = selectedTeamId
      ? await Team.findById(selectedTeamId).select("name")
      : null;

    const updatedConversation = await Conversation.findByIdAndUpdate(
      conversationId,
      {
        $set: {
          assignedTo: selectedAgentId,
          "metadata.teamId": selectedTeamId,
          "metadata.routedBy": routedBy,
          "metadata.routedAt": new Date(),
          "metadata.routeReason": reason || "Manual routing",
        },
        $addToSet: {
          participants: selectedAgentId,
        },
      },
      { new: true },
    ).populate("assignedTo", "name email");

    return {
      found: true,
      noAgent: false,
      agentNotFound: false,
      updatedConversation,
      selectedAgentId,
      selectedTeamId,
      agentName: agent?.name,
      teamName: team?.name,
      originalConversation: conversation,
    };
  }

  /**
   * Update conversation status (full version with metadata)
   */
  async updateConversationStatus(
    conversationId: string,
    status: string,
    updatedBy: string,
  ) {
    const validStatuses = ["open", "pending", "closed", "resolved"];
    if (!validStatuses.includes(status)) {
      return { valid: false };
    }

    const conversation = await Conversation.findByIdAndUpdate(
      conversationId,
      {
        $set: {
          status,
          "metadata.statusUpdatedBy": updatedBy,
          "metadata.statusUpdatedAt": new Date(),
        },
      },
      { new: true },
    );

    if (!conversation) {
      return { valid: true, found: false };
    }

    return { valid: true, found: true, conversation };
  }
}
