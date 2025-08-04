import mongoose from 'mongoose';
import crypto from 'crypto';
import { User } from '../models/User';
import { Team } from '../models/Team';
import emailService from './EmailService';
import logger from '../utils/logger';

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
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const teams = await Team.find(query)
      .populate('createdBy', 'name email')
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
        itemsPerPage: limit
      }
    };
  }

  async getTeamById(id: string) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error('Invalid team ID');
    }

    return await Team.findOne({ _id: id, isActive: true })
      .populate('createdBy', 'name email');
  }

  async createTeam(teamData: any) {
    const team = new Team({
      name: teamData.name,
      description: teamData.description,
      color: teamData.color || '#3b82f6',
      createdBy: teamData.createdBy
    });

    await team.save();

    logger.info('Team created successfully', {
      teamId: team._id,
      name: team.name,
      createdBy: teamData.createdBy
    });

    return team;
  }

  async updateTeam(id: string, updateData: any) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error('Invalid team ID');
    }

    const team = await Team.findOneAndUpdate(
      { _id: id, isActive: true },
      updateData,
      { new: true, runValidators: true }
    ).populate('createdBy', 'name email');

    if (team) {
      logger.info('Team updated successfully', {
        teamId: team._id,
        updates: updateData,
        updatedBy: updateData.updatedBy
      });
    }

    return team;
  }

  async deleteTeam(id: string, deletedBy: string) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return { success: false, message: 'Invalid team ID', statusCode: 400 };
    }

    const team = await Team.findOne({ _id: id, isActive: true });
    
    if (!team) {
      return { success: false, message: 'Team not found', statusCode: 404 };
    }

    // Check if team has agents
    const agentCount = await User.countDocuments({ 
      teams: id, 
      isActive: true 
    });

    if (agentCount > 0) {
      return { 
        success: false, 
        message: 'Cannot delete team with active agents. Please reassign or remove agents first.',
        statusCode: 400 
      };
    }

    // Soft delete
    await Team.findByIdAndUpdate(id, {
      isActive: false,
      deletedAt: new Date(),
      deletedBy
    });

    logger.info('Team deleted successfully', {
      teamId: id,
      teamName: team.name,
      deletedBy
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
    search?: string 
  }) {
    const { page, limit, role, status, search } = options;
    
    // Build query
    const query: any = {
      role: 'agent', // Only agents, not admins
      isActive: true
    };

    if (status) {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const agents = await User.find(query)
      .populate('teams', 'name color')
      .populate('invitedBy', 'name email')
      .select('-password')
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
        itemsPerPage: limit
      }
    };
  }

  async getAgentById(id: string) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error('Invalid agent ID');
    }

    return await User.findOne({
      _id: id,
      role: { $in: ['agent', 'admin'] }
    })
    .populate('teams', 'name color')
    .populate('invitedBy', 'name email')
    .select('-password');
  }

  async inviteAgent(inviteData: any) {
    const { name, email, role, teamIds = [], invitedBy } = inviteData;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return { 
        success: false, 
        message: 'Email already registered', 
        statusCode: 400 
      };
    }

    // Verify teams exist
    const teamObjects = await Team.find({ _id: { $in: teamIds } });
    if (teamObjects.length !== teamIds.length) {
      return { 
        success: false, 
        message: 'One or more teams not found', 
        statusCode: 400 
      };
    }

    // Generate temporary password and invite token
    const tempPassword = crypto.randomBytes(12).toString('hex');
    const inviteToken = crypto.randomBytes(32).toString('hex');

    // Create agent user
    const agent = new User({
      name,
      email,
      password: tempPassword,
      role: 'agent', // Always create as agent
      teams: teamIds,
      inviteStatus: 'pending',
      invitedBy,
      invitedAt: new Date(),
      emailVerificationToken: inviteToken,
      permissions: ['chat_support'] // Basic agent permissions
    });

    await agent.save();

    // Get inviter info
    const inviter = await User.findById(invitedBy);
    
    // Send invite email
    await emailService.sendInviteEmail(
      email, 
      inviter?.name || 'Admin', 
      role, 
      inviteToken
    );

    logger.info('Agent invited successfully', {
      agentId: agent._id,
      email,
      role,
      teamIds,
      invitedBy
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
        invitedAt: agent.invitedAt
      }
    };
  }

  async updateAgent(id: string, updateData: any) {
    console.log("Updating agent with data:", updateData);
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return { 
        success: false, 
        message: 'Invalid agent ID', 
        statusCode: 400 
      };
    }


    // Check if email already exists (excluding current agent)
    if (updateData.email) {
      const existingUser = await User.findOne({ 
        email: updateData.email,
        _id: { $ne: id }
      });
      
      if (existingUser) {
        return { 
          success: false, 
          message: 'Email already exists', 
          statusCode: 400 
        };
      }
    }

    // Verify teams exist if provided
    if (updateData.teamIds) {
      const teamObjects = await Team.find({ _id: { $in: updateData.teamIds } });
      if (teamObjects.length !== updateData.teamIds.length) {
        return { 
          success: false, 
          message: 'One or more teams not found', 
          statusCode: 400 
        };
      }
    }

    console.log("Updating agent with data:", updateData);

    const agent = await User.findOneAndUpdate(
      { _id: id, role: { $in: ['agent', 'admin'] } },
      updateData,
      { new: true, runValidators: true }
    ).populate('teams', 'name color').select('-password');

    if (!agent) {
      return { 
        success: false, 
        message: 'Agent not found', 
        statusCode: 404 
      };
    }

    logger.info('Agent updated successfully', {
      agentId: agent._id,
      updates: updateData,
      updatedBy: updateData.updatedBy
    });

    return {
      success: true,
      data: agent
    };
  }

  async deleteAgent(id: string, deletedBy: string) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return { 
        success: false, 
        message: 'Invalid agent ID', 
        statusCode: 400 
      };
    }

    const agent = await User.findOne({
      _id: id,
      role: { $in: ['agent', 'admin'] }
    });

    if (!agent) {
      return { 
        success: false, 
        message: 'Agent not found', 
        statusCode: 404 
      };
    }


    await User.findByIdAndDelete(id);

    logger.info('Agent deleted successfully', {
      agentId: id,
      agentEmail: agent.email,
      deletedBy
    });

    return { success: true };
  }

  async resendAgentInvite(id: string, resentBy: string) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return { 
        success: false, 
        message: 'Invalid agent ID', 
        statusCode: 400 
      };
    }

    const agent = await User.findOne({
      _id: id,
      role: { $in: ['agent', 'admin'] },
      inviteStatus: 'pending'
    });

    if (!agent) {
      return { 
        success: false, 
        message: 'Agent not found or already activated', 
        statusCode: 404 
      };
    }

    // Generate new invite token
    const inviteToken = crypto.randomBytes(32).toString('hex');
    agent.emailVerificationToken = inviteToken;
    agent.invitedAt = new Date();
    await agent.save();

    // Get resender info
    const resender = await User.findById(resentBy);
    
    // Send invite email
    await emailService.sendInviteEmail(
      agent.email, 
      resender?.name || 'Admin', 
      agent.role, 
      inviteToken
    );

    logger.info('Invitation resent successfully', {
      agentId: agent._id,
      email: agent.email,
      resentBy
    });

    return { success: true };
  }

  // =================
  // ANALYTICS & STATS
  // =================

  async getDashboardStats() {
    const totalTeams = await Team.countDocuments({ isActive: true });
    const totalAgents = await User.countDocuments({ 
      role: 'agent', 
      isActive: true 
    });
    const onlineAgents = await User.countDocuments({ 
      role: 'agent', 
      isActive: true,
      status: 'online'
    });
    const pendingInvites = await User.countDocuments({ 
      role: 'agent', 
      inviteStatus: 'pending'
    });

    // Get team stats
    const teamStats = await Team.aggregate([
      { $match: { isActive: true } },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: 'teams',
          as: 'agents'
        }
      },
      {
        $project: {
          name: 1,
          agentCount: { $size: '$agents' },
          onlineAgents: {
            $size: {
              $filter: {
                input: '$agents',
                cond: { $eq: ['$$this.status', 'online'] }
              }
            }
          }
        }
      }
    ]);

    // Get recent activities
    const recentAgents = await User.find({
      role: 'agent'
    })
    .select('name email role inviteStatus createdAt')
    .sort({ createdAt: -1 })
    .limit(5);

    return {
      overview: {
        totalTeams,
        totalAgents,
        onlineAgents,
        pendingInvites
      },
      teamStats,
      recentAgents
    };
  }
}
