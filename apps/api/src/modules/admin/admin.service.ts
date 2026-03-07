import mongoose from "mongoose";
import crypto from "crypto";
import { Team, Widget, Membership, MembershipRole } from "@shared/models";
import logger from "@shared/utils/logger";

export class AdminService {
  // ═══════════════════════════════════════════════════
  //  TEAM MANAGEMENT
  // ═══════════════════════════════════════════════════

  async getTeams(
    organizationId: string,
    options: { page: number; limit: number; search?: string },
  ) {
    const { page, limit, search } = options;

    const query: any = { organizationId, isActive: true };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const teams = await Team.find(query)
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Team.countDocuments(query);

    return {
      teams,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit,
      },
    };
  }

  async getTeamById(organizationId: string, id: string) {
    if (!mongoose.Types.ObjectId.isValid(id)) throw new Error("Invalid team ID");

    return Team.findOne({ _id: id, organizationId, isActive: true }).populate(
      "createdBy",
      "name email",
    );
  }

  async createTeam(organizationId: string, teamData: any) {
    const team = new Team({
      organizationId,
      name: teamData.name,
      description: teamData.description,
      color: teamData.color || "#3b82f6",
      createdBy: teamData.createdBy,
    });

    await team.save();

    logger.info("Team created successfully", {
      teamId: team._id,
      organizationId,
      name: team.name,
      createdBy: teamData.createdBy,
    });

    return team;
  }

  async updateTeam(organizationId: string, id: string, updateData: any) {
    if (!mongoose.Types.ObjectId.isValid(id)) throw new Error("Invalid team ID");

    const team = await Team.findOneAndUpdate(
      { _id: id, organizationId, isActive: true },
      updateData,
      { new: true, runValidators: true },
    ).populate("createdBy", "name email");

    return team;
  }

  async deleteTeam(organizationId: string, id: string) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return { success: false, message: "Invalid team ID", statusCode: 400 };
    }

    const team = await Team.findOne({ _id: id, organizationId, isActive: true });
    if (!team) return { success: false, message: "Team not found", statusCode: 404 };

    await Team.findByIdAndDelete(id);

    // Remove team from all memberships in this org
    await Membership.updateMany({ organizationId }, { $pull: { teams: id } });

    logger.info("Team deleted successfully", { teamId: id, teamName: team.name, organizationId });
    return { success: true };
  }

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
      .populate("userId", "name email avatar status lastSeen isActive")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Membership.countDocuments(memberQuery);

    return {
      agents: members.map((m) => ({
        membershipId: m._id,
        user: m.userId,
        role: m.role,
        teams: m.teams,
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
      .populate("userId", "name email avatar status lastSeen")
      .populate("teams", "name color");

    return membership;
  }

  async updateAgent(organizationId: string, userId: string, updateData: any) {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return { success: false, message: "Invalid user ID", statusCode: 400 };
    }

    const updateFields: any = {};

    if (updateData.role) updateFields.role = updateData.role as MembershipRole;
    if (updateData.teamIds) {
      updateFields.teams = updateData.teamIds.map(
        (id: string) => new mongoose.Types.ObjectId(id),
      );
    }

    const membership = await Membership.findOneAndUpdate(
      { userId, organizationId },
      updateFields,
      { new: true, runValidators: true },
    )
      .populate("userId", "name email avatar status")
      .populate("teams", "name color");

    if (!membership) {
      return { success: false, message: "Agent not found in this organization", statusCode: 404 };
    }

    return { success: true, data: membership };
  }

  async deleteAgent(organizationId: string, userId: string) {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return { success: false, message: "Invalid user ID", statusCode: 400 };
    }

    const membership = await Membership.findOne({ userId, organizationId });
    if (!membership) {
      return { success: false, message: "Agent not found", statusCode: 404 };
    }

    if (membership.role === "owner") {
      return { success: false, message: "Cannot remove the organization owner", statusCode: 403 };
    }

    await Membership.findByIdAndDelete(membership._id);
    return { success: true };
  }

  // ═══════════════════════════════════════════════════
  //  WIDGET MANAGEMENT
  // ═══════════════════════════════════════════════════

  async createWidget(organizationId: string, widgetData: any) {
    const existingWidget = await Widget.findOne({ organizationId });

    if (existingWidget) {
      const updated = await Widget.findOneAndUpdate(
        { organizationId },
        { ...widgetData, organizationId },
        { new: true, runValidators: true },
      );
      return updated;
    }

    const widget = new Widget({
      ...widgetData,
      organizationId,
    });

    await widget.save();

    logger.info("Widget created successfully", {
      widgetId: widget._id,
      organizationId,
      displayName: widget.displayName,
    });

    return widget;
  }

  async getWidget(organizationId: string) {
    let widget = await Widget.findOne({ organizationId });

    if (!widget) {
      widget = new Widget({
        organizationId,
        displayName: "Support Chat",
        backgroundColor: "#10b981",
        publicKey: crypto.randomBytes(16).toString("hex"),
      });
      await widget.save();
      logger.info(`Auto-created default widget for org ${organizationId}`);
    }

    return widget;
  }

  async updateWidget(organizationId: string, updateData: any) {
    const allowedUpdates = {
      displayName: updateData.displayName,
      logoUrl: updateData.logoUrl,
      backgroundColor: updateData.backgroundColor,
    };

    const cleanUpdates = Object.fromEntries(
      Object.entries(allowedUpdates).filter(([_, v]) => v !== undefined),
    );

    let widget = await Widget.findOneAndUpdate({ organizationId }, cleanUpdates, {
      new: true,
      runValidators: true,
    });

    if (!widget) {
      widget = new Widget({
        organizationId,
        displayName: updateData.displayName || "Support Chat",
        backgroundColor: updateData.backgroundColor || "#10b981",
        logoUrl: updateData.logoUrl,
        publicKey: crypto.randomBytes(16).toString("hex"),
      });
      await widget.save();
    }

    return widget;
  }

  // ═══════════════════════════════════════════════════
  //  ANALYTICS & STATS
  // ═══════════════════════════════════════════════════

  async getDashboardStats(organizationId: string) {
    const totalTeams = await Team.countDocuments({ organizationId, isActive: true });

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

    const teamStats = await Team.aggregate([
      { $match: { organizationId: new mongoose.Types.ObjectId(organizationId), isActive: true } },
      {
        $lookup: {
          from: "memberships",
          localField: "_id",
          foreignField: "teams",
          as: "memberEntries",
        },
      },
      {
        $project: {
          name: 1,
          agentCount: { $size: "$memberEntries" },
        },
      },
    ]);

    const recentMembers = await Membership.find({
      organizationId,
      inviteStatus: { $in: ["active", "pending"] },
    })
      .populate("userId", "name email")
      .select("role inviteStatus createdAt")
      .sort({ createdAt: -1 })
      .limit(5);

    return {
      overview: { totalTeams, totalAgents, onlineAgents, pendingInvites },
      teamStats,
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
