import mongoose from "mongoose";
import crypto from "crypto";
import { User } from "../models/User";
import { Team } from "../models/Team";
import emailService from "./EmailService";
import logger from "../utils/logger";
import { Widget } from "../models";

export class AdminService {
  // =================
  // TEAM MANAGEMENT
  // =================

  async getTeams(options: { page: number; limit: number; search?: string }) {
    const { page, limit, search } = options;

    // Build query
    const query: any = { isActive: true };

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

  async getTeamById(id: string) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error("Invalid team ID");
    }

    return await Team.findOne({ _id: id, isActive: true }).populate(
      "createdBy",
      "name email",
    );
  }

  async createTeam(teamData: any) {
    const team = new Team({
      name: teamData.name,
      description: teamData.description,
      color: teamData.color || "#3b82f6",
      createdBy: teamData.createdBy,
    });

    await team.save();

    logger.info("Team created successfully", {
      teamId: team._id,
      name: team.name,
      createdBy: teamData.createdBy,
    });

    return team;
  }

  async updateTeam(id: string, updateData: any) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error("Invalid team ID");
    }

    const team = await Team.findOneAndUpdate(
      { _id: id, isActive: true },
      updateData,
      { new: true, runValidators: true },
    ).populate("createdBy", "name email");

    if (team) {
      logger.info("Team updated successfully", {
        teamId: team._id,
        updates: updateData,
        updatedBy: updateData.updatedBy,
      });
    }

    return team;
  }

  async deleteTeam(id: string, deletedBy: string) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return { success: false, message: "Invalid team ID", statusCode: 400 };
    }

    const team = await Team.findOne({ _id: id, isActive: true });

    if (!team) {
      return { success: false, message: "Team not found", statusCode: 404 };
    }

    // Check if team has agents
    const agentCount = await User.countDocuments({
      teams: id,
      isActive: true,
    });

    // console.log("Deleting team with ID:", id, "by user:", deletedBy);

    // Todo - Uncomment this check if you want to prevent deletion of teams with active agents

    // if (agentCount > 0) {
    //   return {
    //     success: false,
    //     message: 'Cannot delete team with active agents. Please reassign or remove agents first.',
    //     statusCode: 400
    //   };
    // }

    // Soft delete
    await Team.findByIdAndUpdate(id, {
      isActive: false,
      deletedAt: new Date(),
      deletedBy,
    });

    logger.info("Team deleted successfully", {
      teamId: id,
      teamName: team.name,
      deletedBy,
    });

    return { success: true };
  }

  // =================
  // AGENT MANAGEMENT
  // =================

  async getAgents(options: {
    page: number;
    limit: number;
    role?: string;
    status?: string;
    search?: string;
  }) {
    const { page, limit, role, status, search } = options;

    // Build query
    const query: any = {
      role: "agent", // Only agents, not admins
      isActive: true,
    };

    if (status) {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const agents = await User.find(query)
      .populate("teams", "name color")
      .populate("invitedBy", "name email")
      .select("-password")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await User.countDocuments(query);

    return {
      agents,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit,
      },
    };
  }

  async getAgentById(id: string) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error("Invalid agent ID");
    }

    return await User.findOne({
      _id: id,
      role: { $in: ["agent", "admin"] },
    })
      .populate("teams", "name color")
      .populate("invitedBy", "name email")
      .select("-password");
  }

  async inviteAgent(inviteData: any) {
    const { name, email, role, password, teamIds = [], invitedBy } = inviteData;
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return {
        success: false,
        message: "Email already registered",
        statusCode: 400,
      };
    }

    // Verify teams exist
    const teamObjects = await Team.find({ _id: { $in: teamIds } });
    if (teamObjects.length !== teamIds.length) {
      return {
        success: false,
        message: "One or more teams not found",
        statusCode: 400,
      };
    }

    // Generate temporary password and invite token
    const finalPassword = !password
      ? crypto.randomBytes(12).toString("hex")
      : password;
    const inviteToken = crypto.randomBytes(32).toString("hex");

    // Set invitation expiration to 7 days from now
    const inviteExpiresAt = new Date();
    inviteExpiresAt.setDate(inviteExpiresAt.getDate() + 7);

    // Create agent user
    const agent = new User({
      name,
      email,
      password: finalPassword,
      role: "agent", // Always create as agent
      teams: teamIds,
      inviteStatus: "pending",
      invitedBy,
      invitedAt: new Date(),
      inviteExpiresAt,
      emailVerificationToken: inviteToken,
      permissions: ["chat_support"], // Basic agent permissions
    });

    await agent.save();

    // Update agent count for each team
    if (teamIds.length > 0) {
      try {
        await Team.updateMany(
          { _id: { $in: teamIds } },
          { $inc: { agentCount: 1 } },
        );
        logger.info("Incremented agent count for teams:", teamIds);
      } catch (error) {
        logger.error("Failed to increment agent count for teams:", {
          teamIds,
          error: (error as Error).message,
        });
        // Continue with the invitation process even if team count update fails
      }
    }

    // Get inviter info
    const inviter = await User.findById(invitedBy);
    const teamNames = teamObjects.map((team) => team.name).join(", ");
    // Send invite email
    await emailService.sendInviteEmail(
      email,
      inviter?.name || "Admin",
      role,
      inviteToken,
      teamNames,
    );

    logger.info("Agent invited successfully", {
      agentId: agent._id,
      email,
      role,
      teamIds,
      invitedBy,
    });

    return {
      success: true,
      data: {
        id: agent._id,
        name: agent.name,
        email: agent.email,
        role: agent.role,
        teams: agent.teams,
        inviteStatus: agent.inviteStatus,
        invitedAt: agent.invitedAt,
      },
    };
  }

  async updateAgent(id: string, updateData: any) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return {
        success: false,
        message: "Invalid agent ID",
        statusCode: 400,
      };
    }

    // Check if email already exists (excluding current agent)
    if (updateData.email) {
      const existingUser = await User.findOne({
        email: updateData.email,
        _id: { $ne: id },
      });

      if (existingUser) {
        return {
          success: false,
          message: "Email already exists",
          statusCode: 400,
        };
      }
    }

    // Verify teams exist if provided
    if (updateData.teamIds) {
      const teamObjects = await Team.find({ _id: { $in: updateData.teamIds } });
      if (teamObjects.length !== updateData.teamIds.length) {
        return {
          success: false,
          message: "One or more teams not found",
          statusCode: 400,
        };
      }
    }

    // Get the current agent to compare team changes
    const currentAgent = await User.findOne({
      _id: id,
      role: { $in: ["agent", "admin"] },
    });
    if (!currentAgent) {
      return {
        success: false,
        message: "Agent not found",
        statusCode: 404,
      };
    }

    // Convert teamIds to teams if provided
    const updateFields = { ...updateData };
    if (updateData.teamIds) {
      // Get the current teams to calculate differences
      const currentTeamIds = currentAgent.teams.map((team) => team.toString());
      const newTeamIds = updateData.teamIds;

      // Find teams to remove agent from
      const teamsToDecrement = currentTeamIds.filter(
        (teamId: string) => !newTeamIds.includes(teamId),
      );

      // Find teams to add agent to
      const teamsToIncrement = newTeamIds.filter(
        (teamId: string) => !currentTeamIds.includes(teamId),
      );

      // Update agent count for removed teams
      if (teamsToDecrement.length > 0) {
        try {
          await Team.updateMany(
            { _id: { $in: teamsToDecrement } },
            { $inc: { agentCount: -1 } },
          );
          logger.info("Decremented agent count for teams:", teamsToDecrement);
        } catch (error) {
          logger.error("Failed to decrement agent count for teams:", {
            teams: teamsToDecrement,
            error: (error as Error).message,
          });
          // Continue with the update process even if team count update fails
        }
      }

      // Update agent count for added teams
      if (teamsToIncrement.length > 0) {
        try {
          await Team.updateMany(
            { _id: { $in: teamsToIncrement } },
            { $inc: { agentCount: 1 } },
          );
          logger.info("Incremented agent count for teams:", teamsToIncrement);
        } catch (error) {
          logger.error("Failed to increment agent count for teams:", {
            teams: teamsToIncrement,
            error: (error as Error).message,
          });
          // Continue with the update process even if team count update fails
        }
      }

      // Update the teams field
      updateFields.teams = updateData.teamIds;
      delete updateFields.teamIds; // Remove teamIds since we use teams field in the model
    }

    const agent = await User.findOneAndUpdate(
      { _id: id, role: { $in: ["agent", "admin"] } },
      updateFields,
      { new: true, runValidators: true },
    )
      .populate("teams", "name color")
      .select("-password");

    if (!agent) {
      return {
        success: false,
        message: "Agent not found",
        statusCode: 404,
      };
    }

    logger.info("Agent updated successfully", {
      agentId: agent._id,
      updates: updateData,
      updatedBy: updateData.updatedBy,
    });

    return {
      success: true,
      data: agent,
    };
  }

  async deleteAgent(id: string, deletedBy: string) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return {
        success: false,
        message: "Invalid agent ID",
        statusCode: 400,
      };
    }

    const agent = await User.findOne({
      _id: id,
      role: { $in: ["agent", "admin"] },
    });

    if (!agent) {
      return {
        success: false,
        message: "Agent not found",
        statusCode: 404,
      };
    }

    // Decrement agent count from all teams the agent belongs to
    if (agent.teams && agent.teams.length > 0) {
      try {
        await Team.updateMany(
          { _id: { $in: agent.teams } },
          { $inc: { agentCount: -1 } },
        );
        logger.info("Decremented agent count for teams:", agent.teams);
      } catch (error) {
        logger.error("Failed to decrement agent count for teams:", {
          teams: agent.teams,
          error: (error as Error).message,
        });
        // Continue with the deletion process even if team count update fails
      }
    }

    await User.findByIdAndDelete(id);

    logger.info("Agent deleted successfully", {
      agentId: id,
      agentEmail: agent.email,
      deletedBy,
    });

    return { success: true };
  }

  async resendAgentInvite(id: string, resentBy: string) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return {
        success: false,
        message: "Invalid agent ID",
        statusCode: 400,
      };
    }

    const agent = await User.findOne({
      _id: id,
      role: { $in: ["agent", "admin"] },
      inviteStatus: "pending",
    }).populate("teams", "name");

    if (!agent) {
      return {
        success: false,
        message: "Agent not found or already activated",
        statusCode: 404,
      };
    }

    // Generate new invite token
    const inviteToken = crypto.randomBytes(32).toString("hex");
    agent.emailVerificationToken = inviteToken;
    agent.invitedAt = new Date();
    agent.inviteExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
    await agent.save();

    // Get resender info
    const resender = await User.findById(resentBy);
    const teamNames = (agent.teams as any[])
      .map((team) => team.name)
      .join(", ");
    // Send invite email
    await emailService.sendInviteEmail(
      agent.email,
      resender?.name || "Admin",
      agent.role,
      inviteToken,
      teamNames,
    );

    logger.info("Invitation resent successfully", {
      agentId: agent._id,
      email: agent.email,
      resentBy,
    });

    return { success: true };
  }

  async createWidget(widgetData: any) {
    // Check if user already has a widget
    const existingWidget = await Widget.findOne({ userId: widgetData.userId });

    if (existingWidget) {
      // Update existing widget instead of creating new one
      const updatedWidget = await Widget.findOneAndUpdate(
        { userId: widgetData.userId },
        widgetData,
        { new: true, runValidators: true },
      );

      if (updatedWidget) {
        logger.info("Widget updated (via create endpoint)", {
          widgetId: updatedWidget._id,
          displayName: updatedWidget.displayName,
          userId: updatedWidget.userId,
        });
      }

      return updatedWidget;
    }

    // Create new widget if none exists
    const widget = new Widget({
      ...widgetData,
      userId: widgetData.userId,
    });

    await widget.save();

    logger.info("Widget created successfully", {
      widgetId: widget._id,
      displayName: widget.displayName,
      userId: widget.userId,
    });

    return widget;
  }

  async getWidget(userId: string) {
    const widget = await Widget.findOne({ userId });

    if (!widget) {
      throw new Error("Widget not found for this user");
    }

    return widget;
  }

  async updateWidget(userId: string, updateData: any) {
    // Extract only the fields that should be updated
    const allowedUpdates = {
      displayName: updateData.displayName,
      logoUrl: updateData.logoUrl,
      backgroundColor: updateData.backgroundColor,
    };

    // Remove undefined fields to avoid overwriting with undefined
    const cleanUpdates = Object.fromEntries(
      Object.entries(allowedUpdates).filter(
        ([_, value]) => value !== undefined,
      ),
    );

    const widget = await Widget.findOneAndUpdate({ userId }, cleanUpdates, {
      new: true,
      runValidators: true,
    });

    if (!widget) {
      throw new Error("Widget not found for this user");
    }

    logger.info("Widget updated successfully", {
      widgetId: widget._id,
      displayName: widget.displayName,
      userId: widget.userId,
      updates: cleanUpdates,
    });

    return widget;
  }
  // =================
  // ANALYTICS & STATS
  // =================

  async getDashboardStats() {
    const totalTeams = await Team.countDocuments({ isActive: true });
    const totalAgents = await User.countDocuments({
      role: "agent",
      isActive: true,
    });
    const onlineAgents = await User.countDocuments({
      role: "agent",
      isActive: true,
      status: "online",
    });
    const pendingInvites = await User.countDocuments({
      role: "agent",
      inviteStatus: "pending",
    });

    // Get team stats
    const teamStats = await Team.aggregate([
      { $match: { isActive: true } },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "teams",
          as: "agents",
        },
      },
      {
        $project: {
          name: 1,
          agentCount: { $size: "$agents" },
          onlineAgents: {
            $size: {
              $filter: {
                input: "$agents",
                cond: { $eq: ["$$this.status", "online"] },
              },
            },
          },
        },
      },
    ]);

    // Get recent activities
    const recentAgents = await User.find({
      role: "agent",
    })
      .select("name email role inviteStatus createdAt")
      .sort({ createdAt: -1 })
      .limit(5);

    return {
      overview: {
        totalTeams,
        totalAgents,
        onlineAgents,
        pendingInvites,
      },
      teamStats,
      recentAgents,
    };
  }
}
