import { Conversation, Message } from "../models";
import { asyncHandler, sendError, sendResponse } from "../utils/response";
import { Request, Response } from "express";
import logger from "../utils/logger";

// Import socket manager instance
let socketManagerInstance: any = null;

export const setSocketManager = (socketManager: any) => {
  socketManagerInstance = socketManager;
};

export const initConversation = asyncHandler(
  async (req: Request, res: Response) => {
    const { name, email, phone, subject, message, voxoraPublicKey } = req.body;

    try {
      // Validate required fields
      if (!name || !email || !message) {
        return sendError(res, 400, "Name, email and message are required");
      }

      // Create a new conversation
      const conversation = await Conversation.create({
        participants: [], // Will be populated when agents join
        subject: subject || `New conversation from ${name}`,
        status: "open",
        priority: "medium",
        tags: [],
        metadata: {
          customer: {
            name,
            email,
            phone: phone || "",
            initialMessage: message,
            startedAt: new Date(),
          },
          widgetKey: voxoraPublicKey || null,
          source: "widget",
        },
      });

      logger.info(
        `New conversation initialized: ${conversation.id} from ${name} (${email})`,
      );

      // Emit socket event to notify all agents about new conversation
      if (socketManagerInstance) {
        const payload = {
          conversationId: conversation._id,
          customer: { name, email, phone },
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

      // Send success response
      sendResponse(res, 201, true, "Conversation initialized successfully", {
        conversationId: conversation.id,
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
