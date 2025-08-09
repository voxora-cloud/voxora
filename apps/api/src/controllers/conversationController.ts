import { Request, Response } from 'express';
import { ConversationService, MessageService } from '../services';
import { sendResponse, sendError, asyncHandler } from '../utils/response';
import { AuthenticatedRequest, WidgetAuthenticatedRequest } from '../middleware/auth';

// Widget-specific controllers (requires widget auth)
export const createWidgetConversation = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, message, phone, subject, voxoraPublicKey } = req.body;
  const widgetSession = (req as WidgetAuthenticatedRequest).widgetSession;

  try {
    console.log('Creating widget conversation for session:', widgetSession.sessionId);
    console.log('Public key from request:', voxoraPublicKey);
    console.log('Public key from session:', widgetSession.publicKey);

    // Verify the public key matches the authenticated session
    if (voxoraPublicKey !== widgetSession.publicKey) {
      return sendError(res, 400, 'Public key mismatch');
    }

    // Create the conversation
    const conversation = await ConversationService.createWidgetConversation({
      customerName: name,
      customerEmail: email,
      customerPhone: phone,
      subject: subject || 'Widget Conversation',
      initialMessage: message,
      widgetSessionId: widgetSession.sessionId,
      origin: widgetSession.origin,
    });

    sendResponse(res, 201, true, 'Conversation created successfully', {
      conversationId: conversation._id,
      conversation,
      sessionId: widgetSession.sessionId,
    });
  } catch (error: any) {
    console.error('Error creating widget conversation:', error);
    sendError(res, 400, error.message);
  }
});



// Existing authenticated controllers
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
