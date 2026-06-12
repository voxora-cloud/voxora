import mongoose from "mongoose";
import { Membership, MembershipRole } from "@shared/models";
import NotificationService from "@modules/notification/notification.service";

export class AdminService {
  // ═══════════════════════════════════════════════════
  //  AGENT MANAGEMENT (via Membership)
  // ═══════════════════════════════════════════════════

  async getAgents(
    organizationId: string,
    options: { page: number; limit: number; status?: string; search?: string },
  ) {
    const { page, limit, status, search } = options;

    const memberQuery: any = {
      organizationId,
      role: "agent",
      inviteStatus: { $in: ["active", "pending"] },
    };

    if (status) memberQuery["$lookup.status"] = status;

    const members = await Membership.find(memberQuery)
      .populate("userId", "name email status lastSeen isActive")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Membership.countDocuments(memberQuery);

    return {
      agents: members.map((m) => ({
        membershipId: m._id,
        user: m.userId,
        role: m.role,
        inviteStatus: m.inviteStatus,
        invitedAt: m.invitedAt,
        activatedAt: m.activatedAt,
      })),
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit,
      },
    };
  }

  async getAgentById(organizationId: string, userId: string) {
    if (!mongoose.Types.ObjectId.isValid(userId)) throw new Error("Invalid user ID");

    const membership = await Membership.findOne({ userId, organizationId })
      .populate("userId", "name email status lastSeen");

    return membership;
  }

  async updateAgent(organizationId: string, userId: string, updateData: any, requestingUserId: string) {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return { success: false, message: "Invalid user ID", statusCode: 400 };
    }

    const updateFields: any = {};

    if (updateData.role) updateFields.role = updateData.role as MembershipRole;

    const existingMembership = await Membership.findOne({ userId, organizationId })
      .populate("userId", "name email status");

    if (!existingMembership) {
      return { success: false, message: "Agent not found in this organization", statusCode: 404 };
    }

    const membership = await Membership.findOneAndUpdate(
      { userId, organizationId },
      updateFields,
      { new: true, runValidators: true },
    )
      .populate("userId", "name email status");

    if (!membership) {
      return { success: false, message: "Agent not found in this organization", statusCode: 404 };
    }

    if (updateData.role) {
      await this.notifyRoleManagementAction(
        organizationId,
        requestingUserId,
        `Updated ${this.possessive(this.memberName(membership))} role to ${this.roleLabel(updateData.role as MembershipRole)}.`,
        {
          action: "role_updated",
          targetUserId: userId,
          targetMembershipId: membership._id.toString(),
          previousRole: existingMembership.role,
          role: updateData.role,
        },
      );
    }

    return { success: true, data: membership };
  }

  async deleteAgent(organizationId: string, userId: string, requestingUserId: string) {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return { success: false, message: "Invalid user ID", statusCode: 400 };
    }

    const membership = await Membership.findOne({ userId, organizationId })
      .populate("userId", "name email status");
    if (!membership) {
      return { success: false, message: "Agent not found", statusCode: 404 };
    }

    if (membership.role === "owner") {
      return { success: false, message: "Cannot remove the organization owner", statusCode: 403 };
    }

    await Membership.findByIdAndDelete(membership._id);
    await this.notifyRoleManagementAction(
      organizationId,
      requestingUserId,
      `Removed ${this.memberName(membership)} from the organization.`,
      {
        action: "member_removed",
        targetUserId: userId,
        targetMembershipId: membership._id.toString(),
        role: membership.role,
      },
    );
    return { success: true };
  }

  private async notifyRoleManagementAction(
    organizationId: string,
    actorUserId: string,
    description: string,
    metadata: Record<string, unknown>,
  ) {
    await NotificationService.create({
      organizationId,
      userId: actorUserId,
      type: "administrative",
      title: "Role Management",
      description,
      metadata,
    });
  }

  private memberName(membership: any): string {
    return membership.userId?.name || membership.userId?.email || "this user";
  }

  private possessive(name: string): string {
    return name.endsWith("s") ? `${name}'` : `${name}'s`;
  }

  private roleLabel(role: MembershipRole): string {
    return role.charAt(0).toUpperCase() + role.slice(1);
  }

  // ═══════════════════════════════════════════════════
  //  ANALYTICS & STATS
  // ═══════════════════════════════════════════════════

  async getDashboardStats(organizationId: string) {
    const totalAgents = await Membership.countDocuments({
      organizationId,
      role: "agent",
      inviteStatus: "active",
    });

    const pendingInvites = await Membership.countDocuments({
      organizationId,
      inviteStatus: "pending",
    });

    // Online agents — join through populated user
    const agentMemberships = await Membership.find({
      organizationId,
      role: "agent",
      inviteStatus: "active",
    }).populate("userId", "status");

    const onlineAgents = agentMemberships.filter(
      (m) => (m.userId as any)?.status === "online",
    ).length;

    const recentMembers = await Membership.find({
      organizationId,
      inviteStatus: { $in: ["active", "pending"] },
    })
      .populate("userId", "name email")
      .select("role inviteStatus createdAt")
      .sort({ createdAt: -1 })
      .limit(5);

    return {
      overview: { totalAgents, onlineAgents, pendingInvites },
      recentAgents: recentMembers.map((m: any) => ({
        _id: m._id,
        name: m.userId?.name,
        email: m.userId?.email,
        role: m.role,
        inviteStatus: m.inviteStatus,
        createdAt: m.createdAt,
      })),
    };
  }
}
