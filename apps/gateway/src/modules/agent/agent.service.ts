import { Membership } from "@shared/models";
import { User } from "@shared/models";
import logger from "@shared/core/logger";
import { UpdateAgentProfileInput } from "./agent.types";

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

}
