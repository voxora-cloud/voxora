import { Request, Response } from 'express';
import { MessageService } from '../services';
import { sendResponse, sendError, asyncHandler } from '../utils/response';
import { AuthenticatedRequest } from '../middleware/auth';

export const sendMessage = asyncHandler(async (req: Request, res: Response) => {
  const { conversationId, content, type, metadata } = req.body;
  const userId = (req as AuthenticatedRequest).user.userId;

  try {
    const message = await MessageService.sendMessage({
      conversationId,
      senderId: userId,
      content,
      type,
      metadata,
    });

    sendResponse(res, 201, true, 'Message sent successfully', {
      message,
    });
  } catch (error: any) {
    sendError(res, 400, error.message);
  }
});

export const getMessages = asyncHandler(async (req: Request, res: Response) => {
  const { conversationId } = req.params;
  const userId = (req as AuthenticatedRequest).user.userId;
  const { page, limit, before } = req.query;

  try {
    const result = await MessageService.getMessages(conversationId, userId, {
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      before: before ? new Date(before as string) : undefined,
    });

    sendResponse(res, 200, true, 'Messages retrieved successfully', {
      messages: result.messages,
    }, {
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 50,
      total: result.total,
      pages: result.pages,
    });
  } catch (error: any) {
    sendError(res, 400, error.message);
  }
});

export const editMessage = asyncHandler(async (req: Request, res: Response) => {
  const { messageId } = req.params;
  const { content } = req.body;
  const userId = (req as AuthenticatedRequest).user.userId;

  try {
    const message = await MessageService.editMessage(messageId, userId, content);

    if (!message) {
      return sendError(res, 404, 'Message not found or access denied');
    }

    sendResponse(res, 200, true, 'Message edited successfully', {
      message,
    });
  } catch (error: any) {
    sendError(res, 400, error.message);
  }
});

export const deleteMessage = asyncHandler(async (req: Request, res: Response) => {
  const { messageId } = req.params;
  const userId = (req as AuthenticatedRequest).user.userId;

  try {
    await MessageService.deleteMessage(messageId, userId);

    sendResponse(res, 200, true, 'Message deleted successfully');
  } catch (error: any) {
    sendError(res, 400, error.message);
  }
});

export const markAsRead = asyncHandler(async (req: Request, res: Response) => {
  const { messageId } = req.params;
  const userId = (req as AuthenticatedRequest).user.userId;

  try {
    await MessageService.markMessageAsRead(messageId, userId);

    sendResponse(res, 200, true, 'Message marked as read');
  } catch (error: any) {
    sendError(res, 500, 'Failed to mark message as read');
  }
});

export const getUnreadCount = asyncHandler(async (req: Request, res: Response) => {
  const { conversationId } = req.params;
  const userId = (req as AuthenticatedRequest).user.userId;

  try {
    const count = await MessageService.getUnreadCount(conversationId, userId);

    sendResponse(res, 200, true, 'Unread count retrieved successfully', {
      unreadCount: count,
    });
  } catch (error: any) {
    sendError(res, 500, 'Failed to get unread count');
  }
});
