import { Conversation, Message, Team, User } from "../models";
import { asyncHandler, sendError, sendResponse } from "../utils/response";
import { Request, Response } from "express";
import logger from "../utils/logger";
import { Types } from "mongoose";

// Import socket manager instance
let socketManagerInstance: any = null;

export const setSocketManager = (socketManager: any) => {
  socketManagerInstance = socketManager;
};

export const initConversation = asyncHandler(
  async (req: Request, res: Response) => {
    const { message, voxoraPublicKey, visitorName, visitorEmail, sessionId, teamId, department } = req.body;

    try {
      // Validate required fields
      if (!message) {
        return sendError(res, 400, "Message is required");
      }

      // Generate session ID if not provided (for tracking anonymous users)
      const visitorSessionId = sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Determine if visitor is anonymous
      const isAnonymous = !visitorName || !visitorEmail;
      
      // Auto-assign to team and agent if teamId provided or use routing logic
      let assignedTeamId = teamId;
      let assignedAgentId = null;
      
      if (!assignedTeamId && department) {
        // Try to find team by department name/tag
        const team = await Team.findOne({ 
          name: new RegExp(department, 'i'),
          isActive: true 
        });
        assignedTeamId = team?._id;
      }
      
      if (assignedTeamId) {
        // Find available agent from the team using round-robin or least-busy strategy
        assignedAgentId = await findAvailableAgent(assignedTeamId.toString());
      } else {
        // No team specified - use general auto-assignment
        const assignment = await autoAssignConversation();
        assignedTeamId = assignment.teamId;
        assignedAgentId = assignment.agentId;
      }
      
      // Create a new conversation with visitor information
      const conversation = await Conversation.create({
        participants: assignedAgentId ? [assignedAgentId] : [],
        subject: department ? `${department} - New conversation` : `New conversation from widget`,
        status: "open",
        priority: "medium",
        tags: department ? [department] : [],
        assignedTo: assignedAgentId,
        createdBy: assignedAgentId || undefined,
        visitor: {
          sessionId: visitorSessionId,
          name: visitorName || "Anonymous User",
          email: visitorEmail || "anonymous@temp.local",
          isAnonymous,
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
          providedInfoAt: isAnonymous ? undefined : new Date(),
        },
        metadata: {
          customer: {
            initialMessage: message,
            startedAt: new Date(),
          },
          widgetKey: voxoraPublicKey || null,
          source: "widget",
          teamId: assignedTeamId?.toString(),
          department: department || null,
          routingStrategy: teamId ? 'manual' : (department ? 'department' : 'auto'),
        },
      });

      logger.info(
        `New conversation initialized: ${conversation.id} from widget`,
      );

      // Emit socket event to notify all agents about new conversation
      if (socketManagerInstance) {
        const payload = {
          conversationId: conversation._id,
          subject: conversation.subject,
          message,
          timestamp: new Date(),
          priority: conversation.priority,
          status: conversation.status,
        };

        try {
          if (typeof socketManagerInstance.emitToAllUsers === "function") {
            socketManagerInstance.emitToAllUsers(
              "new_widget_conversation",
              payload,
            );
          } else if (socketManagerInstance.ioInstance) {
            socketManagerInstance.ioInstance.emit(
              "new_widget_conversation",
              payload,
            );
          }
          logger.info(
            `Emitted 'new_widget_conversation' for ${conversation._id}`,
          );
        } catch (emitErr: any) {
          logger.error(
            `Failed to emit 'new_widget_conversation': ${emitErr?.message || emitErr}`,
          );
        }
      } else {
        logger.warn(
          "Socket manager instance not available; cannot emit new_widget_conversation",
        );
      }

      // Send success response with session ID for tracking
      sendResponse(res, 201, true, "Conversation initialized successfully", {
        conversationId: conversation.id,
        sessionId: visitorSessionId,
        isAnonymous,
        assignedTo: assignedAgentId,
        assignedAgent: assignedAgentId,
        metadata: {
          teamId: assignedTeamId?.toString(),
          department: department || null,
          routingStrategy: teamId ? 'manual' : (department ? 'department' : 'auto'),
        },
      });
    } catch (error: any) {
      logger.error(`Failed to initialize conversation: ${error.message}`);
      sendError(
        res,
        500,
        "Failed to initialize conversation: " + error.message,
      );
    }
  },
);

/**
 * Update visitor information for a conversation
 * Used when anonymous user provides their name/email
 */
export const updateVisitorInfo = asyncHandler(
  async (req: Request, res: Response) => {
    const { conversationId } = req.params;
    const { name, email, sessionId } = req.body;

    try {
      // Validate required fields
      if (!name && !email) {
        return sendError(res, 400, "At least name or email is required");
      }

      // Find the conversation
      const conversation = await Conversation.findById(conversationId);
      
      if (!conversation) {
        return sendError(res, 404, "Conversation not found");
      }

      // Verify session ID matches (security check)
      if (sessionId && conversation.visitor?.sessionId !== sessionId) {
        return sendError(res, 403, "Invalid session ID");
      }

      // Update visitor information
      const updateData: any = {};
      if (name) {
        updateData["visitor.name"] = name;
      }
      if (email) {
        updateData["visitor.email"] = email;
      }
      
      // Mark as no longer anonymous if both name and email provided
      if (name && email) {
        updateData["visitor.isAnonymous"] = false;
        updateData["visitor.providedInfoAt"] = new Date();
      }

      await Conversation.findByIdAndUpdate(
        conversationId,
        { $set: updateData },
        { new: true }
      );

      // Update all existing messages from this conversation with new visitor info
      await Message.updateMany(
        { 
          conversationId,
          "metadata.source": "widget" 
        },
        {
          $set: {
            "metadata.senderName": name || conversation.visitor?.name,
            "metadata.senderEmail": email || conversation.visitor?.email,
          }
        }
      );

      logger.info(
        `Updated visitor info for conversation ${conversationId}: ${name} <${email}>`
      );

      // Notify agents about the visitor info update via socket
      if (socketManagerInstance) {
        const payload = {
          conversationId,
          visitorName: name,
          visitorEmail: email,
          timestamp: new Date(),
        };

        try {
          if (typeof socketManagerInstance.emitToAllUsers === "function") {
            socketManagerInstance.emitToAllUsers(
              "visitor_info_updated",
              payload,
            );
          } else if (socketManagerInstance.ioInstance) {
            socketManagerInstance.ioInstance.emit(
              "visitor_info_updated",
              payload,
            );
          }
        } catch (emitErr: any) {
          logger.error(
            `Failed to emit 'visitor_info_updated': ${emitErr?.message || emitErr}`
          );
        }
      }

      sendResponse(res, 200, true, "Visitor information updated successfully", {
        name,
        email,
        isAnonymous: !(name && email),
      });
    } catch (error: any) {
      logger.error(`Failed to update visitor info: ${error.message}`);
      sendError(res, 500, "Failed to update visitor information: " + error.message);
    }
  }
);

/**
 * Find available agent from a specific team
 * Strategy: Find agent with least active conversations
 */
async function findAvailableAgent(teamId: string): Promise<string | null> {
  try {
    // Find all active agents in the team
    const agents = await User.find({
      teams: teamId,
      role: { $in: ['agent', 'admin'] },
      isActive: true,
      status: { $in: ['online', 'away'] } // Only online or away agents
    });

    if (agents.length === 0) {
      logger.warn(`No available agents found in team ${teamId}`);
      return null;
    }

    // Count active conversations for each agent
    const agentLoads = await Promise.all(
      agents.map(async (agent) => {
        const activeConvs = await Conversation.countDocuments({
          assignedTo: agent._id,
          status: { $in: ['open', 'pending'] }
        });
        return { agentId: agent._id, load: activeConvs, status: agent.status };
      })
    );

    // Prefer online agents, then sort by load (least busy first)
    agentLoads.sort((a, b) => {
      if (a.status === 'online' && b.status !== 'online') return -1;
      if (a.status !== 'online' && b.status === 'online') return 1;
      return a.load - b.load;
    });

    return agentLoads[0].agentId.toString();
  } catch (error: any) {
    logger.error(`Error finding available agent: ${error.message}`);
    return null;
  }
}

/**
 * Auto-assign conversation to team and agent
 * Strategy: Find team with most available agents, then assign to least-busy agent
 */
async function autoAssignConversation(): Promise<{ teamId: string | null; agentId: string | null }> {
  try {
    // Find all active teams
    const teams = await Team.find({ isActive: true });
    
    if (teams.length === 0) {
      logger.warn('No active teams found for auto-assignment');
      return { teamId: null, agentId: null };
    }

    // Calculate availability score for each team
    const teamScores = await Promise.all(
      teams.map(async (team) => {
        const onlineAgents = await User.countDocuments({
          teams: team._id,
          role: { $in: ['agent', 'admin'] },
          isActive: true,
          status: 'online'
        });
        
        const awayAgents = await User.countDocuments({
          teams: team._id,
          role: { $in: ['agent', 'admin'] },
          isActive: true,
          status: 'away'
        });

        // Score: online agents worth 2 points, away agents worth 1 point
        const score = (onlineAgents * 2) + awayAgents;
        
        return { teamId: team._id.toString(), score, hasAgents: (onlineAgents + awayAgents) > 0 };
      })
    );

    // Filter teams that have agents and sort by score
    const availableTeams = teamScores.filter((t: any) => t.hasAgents).sort((a: any, b: any) => b.score - a.score);
    
    if (availableTeams.length === 0) {
      logger.warn('No teams with available agents found');
      return { teamId: teams[0]._id.toString(), agentId: null }; // Return first team but no agent
    }

    const selectedTeam = availableTeams[0];
    const agentId = await findAvailableAgent(selectedTeam.teamId);

    logger.info(`Auto-assigned conversation to team ${selectedTeam.teamId}, agent ${agentId}`);
    return { teamId: selectedTeam.teamId, agentId };
  } catch (error: any) {
    logger.error(`Error in auto-assignment: ${error.message}`);
    return { teamId: null, agentId: null };
  }
}

// Get widget conversations by sessionId
export const getWidgetConversations = asyncHandler(
  async (req: Request, res: Response) => {
    const { sessionId } = req.query;

    if (!sessionId || typeof sessionId !== 'string') {
      return sendError(res, 400, "Session ID is required");
    }

    try {
      // Find all conversations for this sessionId
      const conversations = await Conversation.find({
        'visitor.sessionId': sessionId,
        'metadata.source': 'widget'
      })
        .select('_id subject status createdAt updatedAt visitor assignedTo metadata')
        .populate('assignedTo', 'name email')
        .sort({ updatedAt: -1 })
        .limit(50)
        .lean();

      // Get last message for each conversation
      const conversationsWithMessages = await Promise.all(
        conversations.map(async (conv) => {
          const lastMessage = await Message.findOne({
            conversationId: conv._id
          })
            .sort({ createdAt: -1 })
            .select('content createdAt')
            .lean();

          // Get agent name if assigned
          const agentName = conv.assignedTo && typeof conv.assignedTo === 'object' 
            ? (conv.assignedTo as any).name 
            : null;

          return {
            _id: conv._id,
            id: conv._id,
            subject: conv.subject,
            status: conv.status,
            createdAt: conv.createdAt,
            updatedAt: conv.updatedAt,
            visitor: conv.visitor,
            assignedTo: typeof conv.assignedTo === 'object' ? (conv.assignedTo as any)._id : conv.assignedTo,
            assignedAgent: agentName,
            assignedTeam: conv.metadata?.teamId,
            lastMessage: lastMessage ? {
              content: lastMessage.content,
              createdAt: lastMessage.createdAt
            } : null,
            lastMessageAt: lastMessage?.createdAt || conv.createdAt,
          };
        })
      );

      logger.info(`Retrieved ${conversationsWithMessages.length} conversations for sessionId: ${sessionId}`);

      sendResponse(res, 200, true, "Conversations retrieved successfully", {
        conversations: conversationsWithMessages,
        total: conversationsWithMessages.length
      });
    } catch (error: any) {
      logger.error(`Error fetching widget conversations: ${error.message}`);
      sendError(res, 500, "Failed to fetch conversations");
    }
  }
);

// Get messages for a specific conversation
export const getConversationMessages = asyncHandler(
  async (req: Request, res: Response) => {
    const { conversationId } = req.params;
    const { sessionId } = req.query;

    if (!sessionId || typeof sessionId !== 'string') {
      return sendError(res, 400, "Session ID is required");
    }

    try {
      // Verify the conversation belongs to this sessionId
      const conversation = await Conversation.findOne({
        _id: conversationId,
        'visitor.sessionId': sessionId,
        'metadata.source': 'widget'
      });

      if (!conversation) {
        return sendError(res, 404, "Conversation not found");
      }

      // Get all messages for this conversation
      const messages = await Message.find({
        conversationId: conversationId
      })
        .sort({ createdAt: 1 })
        .select('senderId content type metadata createdAt')
        .lean();

      sendResponse(res, 200, true, "Messages retrieved successfully", {
        messages: messages.map(msg => ({
          content: msg.content,
          type: msg.type,
          sender: msg.metadata?.source === 'widget' ? 'visitor' : 'agent',
          senderId: msg.senderId,
          senderName: msg.metadata?.senderName || 'Unknown',
          senderEmail: msg.metadata?.senderEmail,
          timestamp: msg.createdAt,
          createdAt: msg.createdAt,
        })),
        total: messages.length
      });
    } catch (error: any) {
      logger.error(`Error fetching conversation messages: ${error.message}`);
      sendError(res, 500, "Failed to fetch messages");
    }
  }
);

/**
 * Route conversation to team or agent
 * Reusable routing logic
 */
export const routeConversation = asyncHandler(
  async (req: Request, res: Response) => {
    const { conversationId } = req.params;
    const { teamId, agentId, reason } = req.body;

    try {
      if (!conversationId) {
        return sendError(res, 400, "Conversation ID is required");
      }

      if (!teamId && !agentId) {
        return sendError(res, 400, "Either teamId or agentId must be provided");
      }

      // Find the conversation
      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        return sendError(res, 404, "Conversation not found");
      }

      let selectedAgentId = agentId;
      let selectedTeamId = teamId;

      // If only teamId provided, find available agent from that team
      if (teamId && !agentId) {
        selectedAgentId = await findAvailableAgent(teamId);
        selectedTeamId = teamId;
        
        if (!selectedAgentId) {
          return sendError(res, 404, `No available agents found in team ${teamId}`);
        }
      } 
      // If only agentId provided, get agent's team
      else if (agentId && !teamId) {
        const agent = await User.findById(agentId).select('teams');
        if (!agent) {
          return sendError(res, 404, "Agent not found");
        }
        selectedTeamId = agent.teams?.[0]?.toString() || null;
      }

      // Get agent and team details
      const agent = await User.findById(selectedAgentId).select('name email');
      const team = selectedTeamId ? await Team.findById(selectedTeamId).select('name') : null;

      // Update conversation
      const updatedConversation = await Conversation.findByIdAndUpdate(
        conversationId,
        {
          $set: {
            assignedTo: selectedAgentId,
            'metadata.teamId': selectedTeamId,
            'metadata.routedBy': (req as any).user?.id || 'system',
            'metadata.routedAt': new Date(),
            'metadata.routeReason': reason || 'Manual routing',
          },
          $addToSet: {
            participants: selectedAgentId
          }
        },
        { new: true }
      ).populate('assignedTo', 'name email');

      logger.info(`Conversation ${conversationId} routed to agent ${selectedAgentId} in team ${selectedTeamId}`);

      // Emit socket event to notify the new agent
      if (socketManagerInstance && selectedAgentId) {
        try {
          const payload = {
            conversationId: conversation._id,
            subject: conversation.subject,
            routedFrom: conversation.assignedTo,
            routedTo: selectedAgentId,
            teamName: team?.name,
            agentName: agent?.name,
            reason: reason || 'Manual routing',
            timestamp: new Date(),
          };

          if (typeof socketManagerInstance.emitToUser === 'function') {
            socketManagerInstance.emitToUser(selectedAgentId.toString(), 'conversation_routed', payload);
          }
        } catch (emitErr: any) {
          logger.error(`Failed to emit routing notification: ${emitErr?.message || emitErr}`);
        }
      }

      sendResponse(res, 200, true, "Conversation routed successfully", {
        conversationId: updatedConversation?._id,
        assignedTo: updatedConversation?.assignedTo,
        teamId: selectedTeamId,
        teamName: team?.name,
        agentName: agent?.name,
      });
    } catch (error: any) {
      logger.error(`Error routing conversation: ${error.message}`);
      sendError(res, 500, "Failed to route conversation");
    }
  }
);

/**
 * Update conversation status
 */
export const updateConversationStatus = asyncHandler(
  async (req: Request, res: Response) => {
    const { conversationId } = req.params;
    const { status } = req.body;

    try {
      if (!conversationId) {
        return sendError(res, 400, "Conversation ID is required");
      }

      const validStatuses = ['open', 'pending', 'closed', 'resolved'];
      if (!status || !validStatuses.includes(status)) {
        return sendError(res, 400, `Status must be one of: ${validStatuses.join(', ')}`);
      }

      const conversation = await Conversation.findByIdAndUpdate(
        conversationId,
        {
          $set: {
            status,
            'metadata.statusUpdatedBy': (req as any).user?.id || 'system',
            'metadata.statusUpdatedAt': new Date(),
          }
        },
        { new: true }
      );

      if (!conversation) {
        return sendError(res, 404, "Conversation not found");
      }

      logger.info(`Conversation ${conversationId} status updated to ${status}`);

      // Emit socket event
      if (socketManagerInstance) {
        try {
          const payload = {
            conversationId: conversation._id,
            status,
            updatedBy: (req as any).user?.name || 'Agent',
            timestamp: new Date(),
          };

          if (socketManagerInstance.ioInstance) {
            socketManagerInstance.ioInstance.to(`conversation:${conversationId}`).emit('status_updated', payload);
          }
        } catch (emitErr: any) {
          logger.error(`Failed to emit status update: ${emitErr?.message || emitErr}`);
        }
      }

      sendResponse(res, 200, true, "Status updated successfully", {
        conversationId: conversation._id,
        status: conversation.status,
      });
    } catch (error: any) {
      logger.error(`Error updating conversation status: ${error.message}`);
      sendError(res, 500, "Failed to update status");
    }
  }
);
