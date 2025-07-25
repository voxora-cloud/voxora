import { Request, Response } from 'express';
import { ConversationService } from '../services';
import { sendResponse, sendError, asyncHandler } from '../utils/response';
import { AuthenticatedRequest } from '../middleware/auth';

export const createConversation = asyncHandler(async (req: Request, res: Response) => {
  const { participantId, subject, priority, tags } = req.body;
  const userId = (req as AuthenticatedRequest).user.userId;

  try {
    const conversation = await ConversationService.createConversation({
      createdBy: userId,
      participantId,
      subject,
      priority,
      tags,
    });

    sendResponse(res, 201, true, 'Conversation created successfully', {
      conversation,
    });
  } catch (error: any) {
    sendError(res, 400, error.message);
  }
});

export const getConversations = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as AuthenticatedRequest).user.userId;
  const { page, limit, status, assignedTo } = req.query;

  try {
    const result = await ConversationService.getConversations(userId, {
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      status: status as string,
      assignedTo: assignedTo as string,
    });

    sendResponse(res, 200, true, 'Conversations retrieved successfully', {
      conversations: result.conversations,
    }, {
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 20,
      total: result.total,
      pages: result.pages,
    });
  } catch (error: any) {
    sendError(res, 500, 'Failed to retrieve conversations');
  }
});

export const getConversationById = asyncHandler(async (req: Request, res: Response) => {
  const { conversationId } = req.params;
  const userId = (req as AuthenticatedRequest).user.userId;

  try {
    const conversation = await ConversationService.getConversationById(
      conversationId,
      userId
    );

    if (!conversation) {
      return sendError(res, 404, 'Conversation not found');
    }

    sendResponse(res, 200, true, 'Conversation retrieved successfully', {
      conversation,
    });
  } catch (error: any) {
    sendError(res, 500, 'Failed to retrieve conversation');
  }
});

export const updateConversation = asyncHandler(async (req: Request, res: Response) => {
  const { conversationId } = req.params;
  const userId = (req as AuthenticatedRequest).user.userId;
  const updates = req.body;

  try {
    const conversation = await ConversationService.updateConversation(
      conversationId,
      userId,
      updates
    );

    if (!conversation) {
      return sendError(res, 404, 'Conversation not found or access denied');
    }

    sendResponse(res, 200, true, 'Conversation updated successfully', {
      conversation,
    });
  } catch (error: any) {
    sendError(res, 500, 'Failed to update conversation');
  }
});

export const assignConversation = asyncHandler(async (req: Request, res: Response) => {
  const { conversationId } = req.params;
  const { agentId } = req.body;
  const user = (req as AuthenticatedRequest).user;

  // Check if user has permission
  if (!['admin', 'agent'].includes(user.role)) {
    return sendError(res, 403, 'Insufficient permissions');
  }

  try {
    const conversation = await ConversationService.assignConversation(
      conversationId,
      agentId
    );

    if (!conversation) {
      return sendError(res, 404, 'Conversation not found');
    }

    sendResponse(res, 200, true, 'Conversation assigned successfully', {
      conversation,
    });
  } catch (error: any) {
    sendError(res, 400, error.message);
  }
});

export const closeConversation = asyncHandler(async (req: Request, res: Response) => {
  const { conversationId } = req.params;
  const userId = (req as AuthenticatedRequest).user.userId;

  try {
    const conversation = await ConversationService.closeConversation(
      conversationId,
      userId
    );

    if (!conversation) {
      return sendError(res, 404, 'Conversation not found');
    }

    sendResponse(res, 200, true, 'Conversation closed successfully', {
      conversation,
    });
  } catch (error: any) {
    sendError(res, 500, 'Failed to close conversation');
  }
});
