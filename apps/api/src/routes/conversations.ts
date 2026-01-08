import { Router, Request, Response } from "express";
import { auth, AuthenticatedRequest } from "../middleware/auth";
import { Conversation, Message } from "../models";
import { sendResponse, sendError, asyncHandler } from "../utils/response";

const router = Router();

// Get all conversations for an agent
// Todo Move this into ConversationController

router.get(
  "/",
  auth,
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    try {
      const { status, limit = 50, offset = 0 } = req.query;

      const filter: any = {};
      if (status && status !== "all") {
        filter.status = status;
      }

      const conversations = await Conversation.find(filter)
        .sort({ updatedAt: -1 })
        .limit(Number(limit))
        .skip(Number(offset))
        .lean();
      
      const userId = authReq.user?.userId;

      // Get message counts and last messages for each conversation
      const conversationsWithMeta = await Promise.all(
        conversations.map(async (conv) => {
          const lastMessage = await Message.findOne({
            conversationId: conv._id,
          })
            .sort({ createdAt: -1 })
            .lean();

          // Count messages that are from "widget" (customer) AND NOT read by this user
          const unreadCount = await Message.countDocuments({
            conversationId: conv._id,
            "metadata.source": "widget",
            "readBy.userId": { $ne: userId }
          });

          return {
            ...conv,
            lastMessage,
            unreadCount,
            lastMessageAt: lastMessage?.createdAt || conv.updatedAt,
          };
        }),
      );

      sendResponse(res, 200, true, "Conversations fetched successfully", {
        conversations: conversationsWithMeta,
        total: conversations.length,
      });
    } catch (error: any) {
      sendError(res, 500, "Failed to fetch conversations: " + error.message);
    }
  }),
);

// Get a specific conversation with messages
router.get(
  "/:conversationId",
  auth,
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { conversationId } = req.params;

      const conversation = await Conversation.findById(conversationId).lean();
      if (!conversation) {
        return sendError(res, 404, "Conversation not found");
      }

      const messages = await Message.find({ conversationId })
        .sort({ createdAt: 1 })
        .lean();

      sendResponse(res, 200, true, "Conversation fetched successfully", {
        conversation,
        messages,
      });
    } catch (error: any) {
      sendError(res, 500, "Failed to fetch conversation: " + error.message);
    }
  }),
);

// Update conversation status
router.patch(
  "/:conversationId/status",
  auth,
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { conversationId } = req.params;
      const { status } = req.body;

      const conversation = await Conversation.findByIdAndUpdate(
        conversationId,
        { status, updatedAt: new Date() },
        { new: true },
      );

      if (!conversation) {
        return sendError(res, 404, "Conversation not found");
      }

      sendResponse(res, 200, true, "Conversation status updated", {
        conversation,
      });
    } catch (error: any) {
      sendError(res, 500, "Failed to update conversation: " + error.message);
    }
  }),
);

// Mark all messages in a conversation as read
router.post(
  "/:conversationId/read",
  auth,
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { conversationId } = req.params;
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user?.userId;

      if (!userId) {
        return sendError(res, 401, "User not authenticated");
      }

      // Update all messages in this conversation that don't have this user in readBy
      await Message.updateMany(
        {
          conversationId,
          "metadata.source": "widget",
          "readBy.userId": { $ne: userId },
        },
        {
          $push: {
            readBy: {
              userId,
              readAt: new Date(),
            },
          },
        },
      );

      sendResponse(res, 200, true, "Messages marked as read");
    } catch (error: any) {
      sendError(res, 500, "Failed to mark messages as read: " + error.message);
    }
  }),
);

export default router;
