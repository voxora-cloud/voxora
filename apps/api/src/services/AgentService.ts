import mongoose from 'mongoose';
import { User } from '../models/User';
import { Team } from '../models/Team';
import { Conversation } from '../models/Conversation';
import { Message } from '../models/Message';
import logger from '../utils/logger';

export class AgentService {
  
  // =================
  // AGENT PROFILE
  // =================

  async getAgentProfile(userId: string) {
    return await User.findById(userId)
      .populate('teams', 'name color description')
      .select('-password');
  }

  async updateAgentProfile(userId: string, updateData: any) {
    const updates: any = {};

    if (updateData.name) updates.name = updateData.name;
    if (updateData.phoneNumber) updates.phoneNumber = updateData.phoneNumber;
    if (updateData.avatar) updates.avatar = updateData.avatar;

    const agent = await User.findByIdAndUpdate(
      userId,
      updates,
      { new: true, runValidators: true }
    ).populate('teams', 'name color description').select('-password');

    if (agent) {
      logger.info('Agent profile updated', {
        agentId: agent._id,
        updates
      });
    }

    return agent;
  }

  async updateAgentStatus(userId: string, status: string) {
    const agent = await User.findByIdAndUpdate(
      userId,
      { 
        status,
        lastSeen: new Date()
      },
      { new: true }
    ).select('name email status lastSeen');

    if (agent) {
      logger.info('Agent status updated', {
        agentId: agent._id,
        status
      });
    }

    return agent ? {
      status: agent.status,
      lastSeen: agent.lastSeen
    } : null;
  }

  // =================
  // CONVERSATIONS
  // =================

  async getAgentConversations(userId: string, options: {
    page: number;
    limit: number;
    status?: string;
    priority?: string;
    search?: string;
  }) {
    const { page, limit, status, priority, search } = options;

    // Get agent's teams
    const agent = await User.findById(userId).select('teams');
    if (!agent) {
      throw new Error('Agent not found');
    }

    // Build query - simplified to only check assigned conversations
    const query: any = {
      assignedTo: userId
    };

    if (status) {
      query.status = status;
    }

    if (priority) {
      query.priority = priority;
    }

    if (search) {
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { subject: { $regex: search, $options: 'i' } }
        ]
      });
    }

    const conversations = await Conversation.find(query)
      .populate('assignedTo', 'name email')
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Conversation.countDocuments(query);

    return {
      conversations,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit
      }
    };
  }

  async getConversationById(userId: string, conversationId: string) {
    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      throw new Error('Invalid conversation ID');
    }

    // Get agent's teams
    const agent = await User.findById(userId).select('teams');
    if (!agent) {
      return null;
    }

    const conversation = await Conversation.findOne({
      _id: conversationId,
      assignedTo: userId
    })
    .populate('assignedTo', 'name email');

    if (!conversation) {
      return null;
    }

    // Get messages for this conversation
    const messages = await Message.find({ conversationId })
      .populate('senderId', 'name email role')
      .sort({ createdAt: 1 });

    return {
      conversation,
      messages
    };
  }

  async assignConversationToAgent(userId: string, conversationId: string) {
    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return { 
        success: false, 
        message: 'Invalid conversation ID', 
        statusCode: 400 
      };
    }

    // Get agent's teams
    const agent = await User.findById(userId).select('teams');
    if (!agent) {
      return { 
        success: false, 
        message: 'Agent not found', 
        statusCode: 404 
      };
    }

    const conversation = await Conversation.findOne({
      _id: conversationId,
      status: { $ne: 'closed' } // Only allow assignment to non-closed conversations
    });

    if (!conversation) {
      return { 
        success: false, 
        message: 'Conversation not found or already closed', 
        statusCode: 404 
      };
    }

    // Assign conversation to current agent
    conversation.assignedTo = new mongoose.Types.ObjectId(userId);
    conversation.status = 'open';
    await conversation.save();

    logger.info('Conversation assigned', {
      conversationId,
      assignedTo: userId
    });

    return {
      success: true,
      data: conversation
    };
  }

  async transferConversation(userId: string, conversationId: string, agentEmail: string, note?: string) {
    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return { 
        success: false, 
        message: 'Invalid conversation ID', 
        statusCode: 400 
      };
    }

    // Find target agent
    const targetAgent = await User.findOne({
      email: agentEmail,
      role: { $in: ['agent', 'admin'] },
      isActive: true
    });

    if (!targetAgent) {
      return { 
        success: false, 
        message: 'Target agent not found', 
        statusCode: 404 
      };
    }

    // Get current conversation
    const conversation = await Conversation.findOne({
      _id: conversationId,
      assignedTo: userId
    });

    if (!conversation) {
      return { 
        success: false, 
        message: 'Conversation not found or not assigned to you', 
        statusCode: 404 
      };
    }

    // Check if target agent is in the conversation's team (if conversation has team field)
    // Note: Current Conversation model doesn't have team field, so skipping team check
    
    // Transfer conversation
    conversation.assignedTo = new mongoose.Types.ObjectId(targetAgent._id.toString());
    conversation.status = 'pending';
    
    // Add transfer note if provided
    if (note) {
      // Note: This would require adding a notes field to the conversation model
      // For now, we'll just log it
      logger.info('Conversation transfer note', {
        conversationId,
        note,
        fromAgent: userId,
        toAgent: targetAgent._id
      });
    }
    
    await conversation.save();

    logger.info('Conversation transferred', {
      conversationId,
      fromAgent: userId,
      toAgent: targetAgent._id,
      note
    });

    return { success: true };
  }

  async updateConversationStatus(userId: string, conversationId: string, status: string) {
    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return { 
        success: false, 
        message: 'Invalid conversation ID', 
        statusCode: 400 
      };
    }

    // Get agent's teams
    const agent = await User.findById(userId).select('teams');
    if (!agent) {
      return { 
        success: false, 
        message: 'Agent not found', 
        statusCode: 404 
      };
    }

    const conversation = await Conversation.findOneAndUpdate(
      {
        _id: conversationId,
        assignedTo: userId
      },
      { status },
      { new: true }
    );

    if (!conversation) {
      return { 
        success: false, 
        message: 'Conversation not found or access denied', 
        statusCode: 404 
      };
    }

    logger.info('Conversation status updated', {
      conversationId,
      status,
      updatedBy: userId
    });

    return {
      success: true,
      data: { status: conversation.status }
    };
  }

  async addConversationNote(userId: string, conversationId: string, content: string, isInternal: boolean = true) {
    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return { 
        success: false, 
        message: 'Invalid conversation ID', 
        statusCode: 400 
      };
    }

    // Get agent's teams
    const agent = await User.findById(userId).select('teams');
    if (!agent) {
      return { 
        success: false, 
        message: 'Agent not found', 
        statusCode: 404 
      };
    }

    const conversation = await Conversation.findOne({
      _id: conversationId,
      assignedTo: userId
    });

    if (!conversation) {
      return { 
        success: false, 
        message: 'Conversation not found or access denied', 
        statusCode: 404 
      };
    }

    // For now, we'll create a simple note structure
    // In a real application, you might want a separate Notes model
    const note = {
      content,
      isInternal,
      createdBy: userId,
      createdAt: new Date()
    };

    logger.info('Note added to conversation', {
      conversationId,
      addedBy: userId,
      isInternal,
      content: content.substring(0, 100) // Log first 100 chars for debugging
    });

    return {
      success: true,
      data: note
    };
  }

  // =================
  // TEAM INFORMATION
  // =================

  async getAgentTeams(userId: string) {
    const agent = await User.findById(userId)
      .populate('teams', 'name description color agentCount onlineAgents')
      .select('teams');

    return agent?.teams || null;
  }

  async getTeamMembers(userId: string, teamId: string) {
    if (!mongoose.Types.ObjectId.isValid(teamId)) {
      throw new Error('Invalid team ID');
    }

    // Check if agent is part of this team
    const agent = await User.findById(userId).select('teams');
    if (!agent || !agent.teams.some(team => team.toString() === teamId)) {
      return null;
    }

    const members = await User.find({
      teams: teamId,
      isActive: true
    }).select('name email role status lastSeen totalChats rating');

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
      assignedTo: userId
    });

    const activeConversations = await Conversation.countDocuments({
      assignedTo: userId,
      status: { $in: ['open', 'pending'] }
    });

    const resolvedToday = await Conversation.countDocuments({
      assignedTo: userId,
      status: 'resolved',
      updatedAt: {
        $gte: new Date(new Date().setHours(0, 0, 0, 0))
      }
    });

    // Get recent conversations
    const recentConversations = await Conversation.find({
      assignedTo: userId
    })
    .select('subject status priority updatedAt')
    .sort({ updatedAt: -1 })
    .limit(5);

    return {
      overview: {
        totalConversations,
        activeConversations,
        resolvedToday,
        rating: agent.rating,
        totalChats: agent.totalChats
      },
      recentConversations
    };
  }
}
