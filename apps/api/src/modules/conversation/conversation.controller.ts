import { Request, Response } from "express";
import { asyncHandler, sendError, sendResponse } from "@shared/utils/response";
import { ConversationService } from "./conversation.service";
import { getSocketManager } from "@sockets/index";
import logger from "@shared/utils/logger";

const conversationService = new ConversationService();

// Get all conversations for an agent
export const getConversations = asyncHandler(
  async (req: Request, res: Response) => {
    try {
      const { status, limit = 50, offset = 0 } = req.query;

      const userId = (req as any).user?.userId as string | undefined;

      const result = await conversationService.getConversations({
        status: status as string,
        limit: Number(limit),
        offset: Number(offset),
        assignedTo: userId,
      });

      sendResponse(res, 200, true, "Conversations fetched successfully", result);
    } catch (error: any) {
      sendError(res, 500, "Failed to fetch conversations: " + error.message);
    }
  },
);

// Get a specific conversation with messages
export const getConversationById = asyncHandler(
  async (req: Request, res: Response) => {
    try {
      const conversationId = req.params.conversationId as string;

      const result = await conversationService.getConversationById(conversationId);

      if (!result) {
        return sendError(res, 404, "Conversation not found");
      }

      sendResponse(res, 200, true, "Conversation fetched successfully", result);
    } catch (error: any) {
      sendError(res, 500, "Failed to fetch conversation: " + error.message);
    }
  },
);

// PATCH status (simple inline version from old routes/conversations.ts)
export const patchStatus = asyncHandler(
  async (req: Request, res: Response) => {
    try {
      const conversationId = req.params.conversationId as string;
      const { status } = req.body;

      const conversation = await conversationService.patchConversationStatus(
        conversationId,
        status,
      );

      if (!conversation) {
        return sendError(res, 404, "Conversation not found");
      }

      // Notify widget + all room members about the status change
      const sm = getSocketManager();
      if (sm) {
        try {
          const payload = {
            conversationId,
            status,
            updatedBy: (req as any).user?.name || "Agent",
            timestamp: new Date(),
          };
          if (sm.ioInstance) {
            sm.ioInstance
              .to(`conversation:${conversationId}`)
              .emit("status_updated", payload);
          }
        } catch (emitErr: any) {
          logger.error(
            `Failed to emit status update: ${emitErr?.message || emitErr}`,
          );
        }
      }

      sendResponse(res, 200, true, "Conversation status updated", {
        conversation,
      });
    } catch (error: any) {
      sendError(res, 500, "Failed to update conversation: " + error.message);
    }
  },
);

// Update visitor information (public endpoint - no auth required for widget users)
export const updateVisitorInfo = asyncHandler(
  async (req: Request, res: Response) => {
    const conversationId = req.params.conversationId as string;
    const { name, email, sessionId } = req.body;

    try {
      if (!name && !email) {
        return sendError(res, 400, "At least name or email is required");
      }

      const result = await conversationService.updateVisitorInfo(
        conversationId,
        { name, email, sessionId },
      );

      if (!result.found) {
        return sendError(res, 404, "Conversation not found");
      }

      if (!result.validSession) {
        return sendError(res, 403, "Invalid session ID");
      }

      logger.info(
        `Updated visitor info for conversation ${conversationId}: ${name} <${email}>`,
      );

      // Notify agents about the visitor info update via socket
      const sm = getSocketManager();
      if (sm) {
        const payload = {
          conversationId,
          visitorName: name,
          visitorEmail: email,
          timestamp: new Date(),
        };

        try {
          if (typeof sm.emitToAllUsers === "function") {
            sm.emitToAllUsers("visitor_info_updated", payload);
          } else if (sm.ioInstance) {
            sm.ioInstance.emit("visitor_info_updated", payload);
          }
        } catch (emitErr: any) {
          logger.error(
            `Failed to emit 'visitor_info_updated': ${emitErr?.message || emitErr}`,
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
      sendError(
        res,
        500,
        "Failed to update visitor information: " + error.message,
      );
    }
  },
);

// Route conversation to team or agent
export const routeConversation = asyncHandler(
  async (req: Request, res: Response) => {
    const conversationId = req.params.conversationId as string;
    const { teamId, agentId, reason } = req.body;

    try {
      if (!conversationId) {
        return sendError(res, 400, "Conversation ID is required");
      }

      if (!teamId && !agentId) {
        return sendError(
          res,
          400,
          "Either teamId or agentId must be provided",
        );
      }

      const result = await conversationService.routeConversation(
        conversationId,
        { teamId, agentId, reason },
        (req as any).user?.id || "system",
      );

      if (!result.found) {
        return sendError(res, 404, "Conversation not found");
      }

      if (result.noAgent) {
        return sendError(
          res,
          404,
          `No available agents found in team ${result.teamId}`,
        );
      }

      if (result.agentNotFound) {
        return sendError(res, 404, "Agent not found");
      }

      logger.info(
        `Conversation ${conversationId} routed to agent ${result.selectedAgentId} in team ${result.selectedTeamId}`,
      );

      // Notify new agent via socket
      const sm = getSocketManager();
      if (sm && result.selectedAgentId) {
        try {
          const payload = {
            conversationId: result.originalConversation!._id,
            subject: result.originalConversation!.subject,
            routedFrom: result.originalConversation!.assignedTo,
            routedTo: result.selectedAgentId,
            teamName: result.teamName,
            agentName: result.agentName,
            reason: reason || "Manual routing",
            timestamp: new Date(),
          };

          // 1. Tell the new agent's dashboard sidebar
          if (typeof sm.emitToUser === "function") {
            sm.emitToUser(
              result.selectedAgentId.toString(),
              "new_widget_conversation",
              payload,
            );
          }

          // 2. Tell the widget so the agent badge updates (re-uses conversation_escalated event)
          sm.emitToConversation(conversationId, "conversation_escalated", {
            conversationId,
            reason: reason || "Transferred to another agent",
            agent: {
              id: result.selectedAgentId.toString(),
              name: result.agentName,
              email: result.agentEmail,
            },
          });

          // 3. Remove the conversation from the OLD agent's sidebar (if there was one)
          const oldAgentId = result.originalConversation!.assignedTo;
          if (
            oldAgentId &&
            oldAgentId.toString() !== result.selectedAgentId.toString() &&
            typeof sm.emitToUser === "function"
          ) {
            sm.emitToUser(oldAgentId.toString(), "conversation_removed", {
              conversationId,
            });
          }
        } catch (emitErr: any) {
          logger.error(
            `Failed to emit routing notification: ${emitErr?.message || emitErr}`,
          );
        }
      }

      sendResponse(res, 200, true, "Conversation routed successfully", {
        conversationId: result.updatedConversation?._id,
        assignedTo: result.updatedConversation?.assignedTo,
        teamId: result.selectedTeamId,
        teamName: result.teamName,
        agentName: result.agentName,
      });
    } catch (error: any) {
      logger.error(`Error routing conversation: ${error.message}`);
      sendError(res, 500, "Failed to route conversation");
    }
  },
);

// Update conversation status (full version with metadata)
export const updateConversationStatus = asyncHandler(
  async (req: Request, res: Response) => {
    const conversationId = req.params.conversationId as string;
    const { status } = req.body;

    try {
      if (!conversationId) {
        return sendError(res, 400, "Conversation ID is required");
      }

      const result = await conversationService.updateConversationStatus(
        conversationId,
        status,
        (req as any).user?.id || "system",
      );

      if (!result.valid) {
        return sendError(
          res,
          400,
          "Status must be one of: open, pending, closed, resolved",
        );
      }

      if (!result.found) {
        return sendError(res, 404, "Conversation not found");
      }

      logger.info(
        `Conversation ${conversationId} status updated to ${status}`,
      );

      // Emit socket event
      const sm = getSocketManager();
      if (sm) {
        try {
          const payload = {
            conversationId: result.conversation!._id,
            status,
            updatedBy: (req as any).user?.name || "Agent",
            timestamp: new Date(),
          };

          if (sm.ioInstance) {
            sm.ioInstance
              .to(`conversation:${conversationId}`)
              .emit("status_updated", payload);
          }
        } catch (emitErr: any) {
          logger.error(
            `Failed to emit status update: ${emitErr?.message || emitErr}`,
          );
        }
      }

      sendResponse(res, 200, true, "Status updated successfully", {
        conversationId: result.conversation!._id,
        status: result.conversation!.status,
      });
    } catch (error: any) {
      logger.error(`Error updating conversation status: ${error.message}`);
      sendError(res, 500, "Failed to update status");
    }
  },
);
