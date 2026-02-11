import mongoose from "mongoose";
import { User } from "../models/User";
import { Conversation } from "../models/Conversation";
import logger from "../utils/logger";

export class AgentService {
  // =================
  // AGENT PROFILE
  // =================

  async getAgentProfile(userId: string) {
    return await User.findById(userId)
      .populate("teams", "name color description")
      .select("-password");
  }

  async updateAgentProfile(userId: string, updateData: any) {
    const updates: any = {};

    if (updateData.name) updates.name = updateData.name;
    if (updateData.phoneNumber) updates.phoneNumber = updateData.phoneNumber;
    if (updateData.avatar) updates.avatar = updateData.avatar;

    const agent = await User.findByIdAndUpdate(userId, updates, {
      new: true,
      runValidators: true,
    })
      .populate("teams", "name color description")
      .select("-password");

    if (agent) {
      logger.info("Agent profile updated", {
        agentId: agent._id,
        updates,
      });
    }

    return agent;
  }

  async updateAgentStatus(userId: string, status: string) {
    const agent = await User.findByIdAndUpdate(
      userId,
      {
        status,
        lastSeen: new Date(),
      },
      { new: true },
    ).select("name email status lastSeen");

    if (agent) {
      logger.info("Agent status updated", {
        agentId: agent._id,
        status,
      });
    }

    return agent
      ? {
          status: agent.status,
          lastSeen: agent.lastSeen,
        }
      : null;
  }

  // =================
  // TEAM INFORMATION
  // =================

  async getAgentTeams(userId: string) {
    const agent = await User.findById(userId)
      .populate("teams", "name description color agentCount onlineAgents")
      .select("teams");

    return agent?.teams || null;
  }

  async getTeamMembers(userId: string, teamId: string) {
    if (!mongoose.Types.ObjectId.isValid(teamId)) {
      throw new Error("Invalid team ID");
    }

    // Check if agent is part of this team
    const agent = await User.findById(userId).select("teams");
    if (!agent || !agent.teams.some((team: any) => team.toString() === teamId)) {
      return null;
    }

    const members = await User.find({
      teams: teamId,
      isActive: true,
    }).select("name email role status lastSeen totalChats rating");

    return members;
  }

  // =================
  // AGENT STATS
  // =================

  async getAgentStats(userId: string) {
    const agent = await User.findById(userId);
    if (!agent) {
      return null;
    }

    // Get conversation stats
    const totalConversations = await Conversation.countDocuments({
      assignedTo: userId,
    });

    const activeConversations = await Conversation.countDocuments({
      assignedTo: userId,
      status: { $in: ["open", "pending"] },
    });

    const resolvedToday = await Conversation.countDocuments({
      assignedTo: userId,
      status: "resolved",
      updatedAt: {
        $gte: new Date(new Date().setHours(0, 0, 0, 0)),
      },
    });

    // Get recent conversations
    const recentConversations = await Conversation.find({
      assignedTo: userId,
    })
      .select("subject status priority updatedAt")
      .sort({ updatedAt: -1 })
      .limit(5);

    return {
      overview: {
        totalConversations,
        activeConversations,
        resolvedToday,
        rating: agent.rating,
        totalChats: agent.totalChats,
      },
      recentConversations,
    };
  }
}
