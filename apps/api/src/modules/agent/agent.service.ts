import mongoose from "mongoose";
import { Membership, Team, Conversation } from "@shared/models";
import { User } from "@shared/models";
import logger from "@shared/utils/logger";

export class AgentService {
  // ═══════════════════════════════════════════════════
  //  AGENT PROFILE
  // ═══════════════════════════════════════════════════

  async getAgentProfile(userId: string, organizationId: string) {
    const membership = await Membership.findOne({ userId, organizationId })
      .populate("userId", "-password")
      .populate("teams", "name color description");
    return membership;
  }

  async updateAgentProfile(userId: string, updateData: { name?: string; phoneNumber?: string; avatar?: string }) {
    const updates: any = {};
    if (updateData.name) updates.name = updateData.name;
    if (updateData.phoneNumber) updates.phoneNumber = updateData.phoneNumber;
    if (updateData.avatar) updates.avatar = updateData.avatar;

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
  //  TEAM INFORMATION (org-scoped)
  // ═══════════════════════════════════════════════════

  async getAgentTeams(userId: string, organizationId: string) {
    const membership = await Membership.findOne({ userId, organizationId }).populate(
      "teams",
      "name description color agentCount",
    );
    return membership?.teams || [];
  }

  async getTeamMembers(userId: string, organizationId: string, teamId: string) {
    if (!mongoose.Types.ObjectId.isValid(teamId)) throw new Error("Invalid team ID");

    // Verify the requesting agent is in this org
    const membership = await Membership.findOne({ userId, organizationId });
    if (!membership) return null;

    // Get all members in the org who are in this team
    const members = await Membership.find({
      organizationId,
      teams: teamId,
      inviteStatus: "active",
    }).populate("userId", "name email status lastSeen avatar");

    return members.map((m) => ({
      user: m.userId,
      role: m.role,
      membershipId: m._id,
    }));
  }

  async getAllTeams(organizationId: string) {
    return Team.find({ organizationId, isActive: { $ne: false } })
      .select("name description color agentCount")
      .sort({ name: 1 });
  }

  async getAllTeamMembers(organizationId: string, teamId: string) {
    if (!mongoose.Types.ObjectId.isValid(teamId)) throw new Error("Invalid team ID");

    const members = await Membership.find({
      organizationId,
      teams: teamId,
      inviteStatus: "active",
    }).populate("userId", "name email status lastSeen");

    return members.map((m) => ({ user: m.userId, role: m.role }));
  }

  // ═══════════════════════════════════════════════════
  //  AGENT STATS (org-scoped)
  // ═══════════════════════════════════════════════════

  async getAgentStats(userId: string, organizationId: string) {
    const membership = await Membership.findOne({ userId, organizationId });
    if (!membership) return null;

    const [totalConversations, activeConversations, resolvedToday, recentConversations] = await Promise.all([
      Conversation.countDocuments({ organizationId, assignedTo: userId }),
      Conversation.countDocuments({ organizationId, assignedTo: userId, status: { $in: ["open", "pending"] } }),
      Conversation.countDocuments({
        organizationId,
        assignedTo: userId,
        status: "resolved",
        updatedAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      }),
      Conversation.find({ organizationId, assignedTo: userId })
        .select("subject status priority updatedAt")
        .sort({ updatedAt: -1 })
        .limit(5),
    ]);

    const user = await User.findById(userId).select("_id");

    return {
      overview: { totalConversations, activeConversations, resolvedToday, rating: 5.0, totalChats: totalConversations },
      recentConversations,
    };
  }
}
