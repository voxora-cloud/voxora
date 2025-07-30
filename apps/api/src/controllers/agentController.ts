import { Request, Response } from 'express';
import { AgentService } from '../services/AgentService';
import { sendResponse, sendError, asyncHandler } from '../utils/response';
import { AuthenticatedRequest } from '../middleware/auth';

const agentService = new AgentService();

// =================
// AGENT PROFILE
// =================

export const getProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  try {
    const agent = await agentService.getAgentProfile(req.user.userId);
    
    if (!agent) {
      return sendError(res, 404, 'Agent not found');
    }

    sendResponse(res, 200, true, 'Profile retrieved successfully', agent);
  } catch (error: any) {
    sendError(res, 500, error.message);
  }
});

export const updateProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  try {
    const agent = await agentService.updateAgentProfile(req.user.userId, req.body);
    
    if (!agent) {
      return sendError(res, 404, 'Agent not found');
    }

    sendResponse(res, 200, true, 'Profile updated successfully', agent);
  } catch (error: any) {
    sendError(res, 500, error.message);
  }
});

export const updateStatus = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { status } = req.body;
  
  try {
    const result = await agentService.updateAgentStatus(req.user.userId, status);
    
    if (!result) {
      return sendError(res, 404, 'Agent not found');
    }

    sendResponse(res, 200, true, 'Status updated successfully', result);
  } catch (error: any) {
    sendError(res, 500, error.message);
  }
});

// =================
// CONVERSATIONS
// =================

export const getConversations = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { page = 1, limit = 20, status, priority, search } = req.query;
  
  try {
    const options = {
      page: Number(page),
      limit: Number(limit),
      status: status as string,
      priority: priority as string,
      search: search as string
    };

    const result = await agentService.getAgentConversations(req.user.userId, options);
    sendResponse(res, 200, true, 'Conversations retrieved successfully', result);
  } catch (error: any) {
    sendError(res, 500, error.message);
  }
});

export const getConversationById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  
  try {
    const result = await agentService.getConversationById(req.user.userId, id);
    
    if (!result) {
      return sendError(res, 404, 'Conversation not found or access denied');
    }

    sendResponse(res, 200, true, 'Conversation retrieved successfully', result);
  } catch (error: any) {
    sendError(res, 500, error.message);
  }
});

export const assignConversation = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  
  try {
    const result = await agentService.assignConversationToAgent(req.user.userId, id);
    
    if (!result.success) {
      return sendError(res, result.statusCode || 400, result.message || 'Assignment failed');
    }

    sendResponse(res, 200, true, 'Conversation assigned successfully', result.data);
  } catch (error: any) {
    sendError(res, 500, error.message);
  }
});

export const transferConversation = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { agentEmail, note } = req.body;
  
  try {
    const result = await agentService.transferConversation(
      req.user.userId, 
      id, 
      agentEmail, 
      note
    );
    
    if (!result.success) {
      return sendError(res, result.statusCode || 400, result.message || 'Transfer failed');
    }

    sendResponse(res, 200, true, 'Conversation transferred successfully');
  } catch (error: any) {
    sendError(res, 500, error.message);
  }
});

export const updateConversationStatus = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;
  
  try {
    const result = await agentService.updateConversationStatus(
      req.user.userId, 
      id, 
      status
    );
    
    if (!result.success) {
      return sendError(res, result.statusCode || 400, result.message || 'Status update failed');
    }

    sendResponse(res, 200, true, 'Conversation status updated successfully', result.data);
  } catch (error: any) {
    sendError(res, 500, error.message);
  }
});

export const addConversationNote = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { content, isInternal = true } = req.body;
  
  try {
    const result = await agentService.addConversationNote(
      req.user.userId, 
      id, 
      content, 
      isInternal
    );
    
    if (!result.success) {
      return sendError(res, result.statusCode || 400, result.message || 'Failed to add note');
    }

    sendResponse(res, 201, true, 'Note added successfully', result.data);
  } catch (error: any) {
    sendError(res, 500, error.message);
  }
});

// =================
// TEAM INFORMATION
// =================

export const getTeams = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  try {
    const teams = await agentService.getAgentTeams(req.user.userId);
    
    if (!teams) {
      return sendError(res, 404, 'Agent not found');
    }

    sendResponse(res, 200, true, 'Teams retrieved successfully', teams);
  } catch (error: any) {
    sendError(res, 500, error.message);
  }
});

export const getTeamMembers = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  
  try {
    const members = await agentService.getTeamMembers(req.user.userId, id);
    
    if (!members) {
      return sendError(res, 403, 'Access denied - not a member of this team');
    }

    sendResponse(res, 200, true, 'Team members retrieved successfully', members);
  } catch (error: any) {
    sendError(res, 500, error.message);
  }
});

// =================
// AGENT STATS
// =================

export const getStats = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  try {
    const stats = await agentService.getAgentStats(req.user.userId);
    
    if (!stats) {
      return sendError(res, 404, 'Agent not found');
    }

    sendResponse(res, 200, true, 'Stats retrieved successfully', stats);
  } catch (error: any) {
    sendError(res, 500, error.message);
  }
});
