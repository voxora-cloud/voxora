import mongoose from "mongoose";
import { Membership, Conversation } from "@shared/models";
import { User } from "@shared/models";
import logger from "@shared/core/logger";

export class AgentService {
  // ═══════════════════════════════════════════════════
  //  AGENT PROFILE
  // ═══════════════════════════════════════════════════

  async getAgentProfile(userId: string, organizationId: string) {
    const membership = await Membership.findOne({ userId, organizationId })
      .populate("userId", "-password");
    return membership;
  }

  async updateAgentProfile(userId: string, updateData: { name?: string; phoneNumber?: string }) {
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
