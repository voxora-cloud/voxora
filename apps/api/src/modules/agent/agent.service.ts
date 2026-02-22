import mongoose from "mongoose";
import { User, Team } from "@shared/models";
import { Conversation } from "@shared/models";
import logger from "@shared/utils/logger";

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

  // Returns ALL teams (used for routing conversations to any team)
  async getAllTeams() {
    return await Team.find({ isActive: { $ne: false } })
      .select("name description color agentCount onlineAgents")
      .sort({ name: 1 });
  }

  // Returns members of any team — no membership check (used for routing)
  async getAllTeamMembers(teamId: string) {
    if (!mongoose.Types.ObjectId.isValid(teamId)) {
      throw new Error("Invalid team ID");
    }

    return await User.find({
      teams: teamId,
      isActive: true,
    }).select("name email role status lastSeen totalChats rating");
  }

  // =================
  // AGENT STATS
  // =================

  async getAgentStats(userId: string) {
    const agent = await User.findById(userId);
    if (!agent) {
      return null;
    }

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
