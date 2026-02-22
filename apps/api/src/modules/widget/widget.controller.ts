import { Request, Response } from "express";
import { sendResponse, sendError, asyncHandler } from "@shared/utils/response";
import { Conversation, Message, Team, User, Widget } from "@shared/models";
import { getSocketManager } from "@sockets/index";
import logger from "@shared/utils/logger";
import config from "@shared/config";
import jwt from "jsonwebtoken";

// ========================
// WIDGET AUTH & CONFIG
// ========================

export const generateWidgetToken = asyncHandler(
  async (req: Request, res: Response) => {
    const { voxoraPublicKey, origin } = req.body;

    try {
      if (!voxoraPublicKey) {
        return sendError(res, 400, "Voxora public key is required");
      }

      const widget = await Widget.findById(voxoraPublicKey);

      if (!widget) {
        return sendError(res, 404, "Widget not found");
      }

      const widgetPayload = {
        publicKey: voxoraPublicKey,
        displayName: widget.displayName || "Unknown Widget",
        userId: widget.userId,
        backgroundColor: widget.backgroundColor || "#FFFFFF",
        origin: origin || req.get("origin") || "unknown",
        type: "widget_session",
      };

      const token = jwt.sign(widgetPayload, config.jwt.secret!, {
        expiresIn: "24h",
      });

      sendResponse(res, 200, true, "Widget token generated successfully", {
        token,
        expiresIn: "24h",
      });
    } catch (error: any) {
      sendError(res, 500, "Failed to generate widget token: " + error.message);
    }
  },
);

export const validateWidgetToken = asyncHandler(
  async (req: Request, res: Response) => {
    const { token } = req.body;

    try {
      if (!token) {
        return sendError(res, 400, "Token is required");
      }

      sendResponse(res, 200, true, "Token is valid", {
        valid: true,
        user: (req as any).widgetSession,
      });
    } catch (error: any) {
      sendError(res, 401, "Invalid token");
    }
  },
);

export const getWidgetConfig = asyncHandler(
  async (req: Request, res: Response) => {
    try {
      const { voxoraPublicKey } = req.query as { voxoraPublicKey?: string };

      if (!voxoraPublicKey) {
        return sendError(res, 400, "voxoraPublicKey is required");
      }

      const widget = await Widget.findById(voxoraPublicKey)
        .select("displayName logoUrl backgroundColor")
        .lean();

      if (!widget) {
        return sendError(res, 404, "Widget not found");
      }

      let logoUrl = (widget as any).logoUrl as string | undefined;
      if (logoUrl) {
        // Normalize any full MinIO URL (presigned or plain) down to just the fileKey,
        // then proxy through the API. This handles both new records (fileKey only)
        // and legacy records that stored a full presigned URL.
        let fileKey = logoUrl;
        if (/^https?:\/\//i.test(logoUrl)) {
          try {
            const u = new URL(logoUrl);
            const parts = u.pathname.split('/').filter(Boolean);
            if (parts.length > 1) fileKey = parts.slice(1).join('/');
          } catch {}
        }
        const scheme = req.get("x-forwarded-proto") || req.protocol || "http";
        const host = req.get("host") || "localhost:3002";
        logoUrl = `${scheme}://${host}/api/v1/storage/file?key=${encodeURIComponent(fileKey)}`;
      }

      return sendResponse(res, 200, true, "Widget config fetched", {
        config: {
          displayName: (widget as any).displayName,
          backgroundColor: (widget as any).backgroundColor,
          logoUrl,
        },
      });
    } catch (error: any) {
      return sendError(
        res,
        500,
        "Failed to fetch widget config: " + error.message,
      );
    }
  },
);

// ========================
// WIDGET CONVERSATIONS
// ========================

/**
 * Find available agent from a specific team (least-busy strategy)
 */
async function findAvailableAgent(teamId: string): Promise<string | null> {
  try {
    const agents = await User.find({
      teams: teamId,
      role: "agent",
      isActive: true,
      status: { $in: ["online", "away"] },
    });

    if (agents.length === 0) {
      logger.warn(`No available agents found in team ${teamId}`);
      return null;
    }

    const agentLoads = await Promise.all(
      agents.map(async (agent) => {
        const activeConvs = await Conversation.countDocuments({
          assignedTo: agent._id,
          status: { $in: ["open", "pending"] },
        });
        return {
          agentId: agent._id,
          load: activeConvs,
          status: agent.status,
        };
      }),
    );

    agentLoads.sort((a, b) => {
      if (a.status === "online" && b.status !== "online") return -1;
      if (a.status !== "online" && b.status === "online") return 1;
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
async function autoAssignConversation(): Promise<{
  teamId: string | null;
  agentId: string | null;
}> {
  try {
    const teams = await Team.find({ isActive: true });

    if (teams.length === 0) {
      logger.warn("No active teams found for auto-assignment");
      return { teamId: null, agentId: null };
    }

    const teamScores = await Promise.all(
      teams.map(async (team) => {
        const onlineAgents = await User.countDocuments({
          teams: team._id,
          role: "agent",
          isActive: true,
          status: "online",
        });

        const awayAgents = await User.countDocuments({
          teams: team._id,
          role: "agent",
          isActive: true,
          status: "away",
        });

        const score = onlineAgents * 2 + awayAgents;
        return {
          teamId: team._id.toString(),
          score,
          hasAgents: onlineAgents + awayAgents > 0,
        };
      }),
    );

    const availableTeams = teamScores
      .filter((t: any) => t.hasAgents)
      .sort((a: any, b: any) => b.score - a.score);

    if (availableTeams.length === 0) {
      logger.warn("No teams with available agents found");
      return { teamId: teams[0]._id.toString(), agentId: null };
    }

    const selectedTeam = availableTeams[0];
    const agentId = await findAvailableAgent(selectedTeam.teamId);

    logger.info(
      `Auto-assigned conversation to team ${selectedTeam.teamId}, agent ${agentId}`,
    );
    return { teamId: selectedTeam.teamId, agentId };
  } catch (error: any) {
    logger.error(`Error in auto-assignment: ${error.message}`);
    return { teamId: null, agentId: null };
  }
}

export const initConversation = asyncHandler(
  async (req: Request, res: Response) => {
    const {
      message,
      voxoraPublicKey,
      visitorName,
      visitorEmail,
      sessionId,
      teamId,
      department,
    } = req.body;

    try {
      if (!message) {
        return sendError(res, 400, "Message is required");
      }

      const visitorSessionId =
        sessionId ||
        `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const isAnonymous = !visitorName || !visitorEmail;

      let assignedTeamId: any = teamId;
      let assignedAgentId: string | null = null;

      if (!assignedTeamId && department) {
        const team = await Team.findOne({
          name: new RegExp(department, "i"),
          isActive: true,
        });
        assignedTeamId = team?._id;
      }

      if (assignedTeamId) {
        assignedAgentId = await findAvailableAgent(assignedTeamId.toString());
      } else {
        const assignment = await autoAssignConversation();
        assignedTeamId = assignment.teamId;
        assignedAgentId = assignment.agentId;
      }

      const conversation = await Conversation.create({
        participants: assignedAgentId ? [assignedAgentId] : [],
        subject: department
          ? `${department} - New conversation`
          : `New conversation from widget`,
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
          userAgent: req.get("user-agent"),
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
          routingStrategy: teamId
            ? "manual"
            : department
              ? "department"
              : "auto",
        },
      });

      logger.info(
        `New conversation initialized: ${conversation.id} from widget`,
      );

      const sm = getSocketManager();
      if (sm) {
        const payload = {
          conversationId: conversation._id,
          subject: conversation.subject,
          message,
          timestamp: new Date(),
          priority: conversation.priority,
          status: conversation.status,
        };

        try {
          if (typeof sm.emitToAllUsers === "function") {
            sm.emitToAllUsers("new_widget_conversation", payload);
          } else if (sm.ioInstance) {
            sm.ioInstance.emit("new_widget_conversation", payload);
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

      sendResponse(
        res,
        201,
        true,
        "Conversation initialized successfully",
        {
          conversationId: conversation.id,
          sessionId: visitorSessionId,
          isAnonymous,
          assignedTo: assignedAgentId,
          assignedAgent: assignedAgentId,
          metadata: {
            teamId: assignedTeamId?.toString(),
            department: department || null,
            routingStrategy: teamId
              ? "manual"
              : department
                ? "department"
                : "auto",
          },
        },
      );
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

export const updateVisitorInfo = asyncHandler(
  async (req: Request, res: Response) => {
    const { conversationId } = req.params;
    const { name, email, sessionId } = req.body;

    try {
      if (!name && !email) {
        return sendError(res, 400, "At least name or email is required");
      }

      const conversation = await Conversation.findById(conversationId);

      if (!conversation) {
        return sendError(res, 404, "Conversation not found");
      }

      if (sessionId && conversation.visitor?.sessionId !== sessionId) {
        return sendError(res, 403, "Invalid session ID");
      }

      const updateData: any = {};
      if (name) updateData["visitor.name"] = name;
      if (email) updateData["visitor.email"] = email;
      if (name && email) {
        updateData["visitor.isAnonymous"] = false;
        updateData["visitor.providedInfoAt"] = new Date();
      }

      await Conversation.findByIdAndUpdate(
        conversationId,
        { $set: updateData },
        { new: true },
      );

      await Message.updateMany(
        {
          conversationId,
          "metadata.source": "widget",
        },
        {
          $set: {
            "metadata.senderName": name || conversation.visitor?.name,
            "metadata.senderEmail": email || conversation.visitor?.email,
          },
        },
      );

      logger.info(
        `Updated visitor info for conversation ${conversationId}: ${name} <${email}>`,
      );

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

      sendResponse(
        res,
        200,
        true,
        "Visitor information updated successfully",
        {
          name,
          email,
          isAnonymous: !(name && email),
        },
      );
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

export const getWidgetConversations = asyncHandler(
  async (req: Request, res: Response) => {
    const { sessionId } = req.query;

    if (!sessionId || typeof sessionId !== "string") {
      return sendError(res, 400, "Session ID is required");
    }

    try {
      const conversations = await Conversation.find({
        "visitor.sessionId": sessionId,
        "metadata.source": "widget",
        status: { $ne: "closed" },   // hide conversations the visitor deleted
      })
        .select(
          "_id subject status createdAt updatedAt visitor assignedTo metadata",
        )
        .populate("assignedTo", "name email")
        .sort({ updatedAt: -1 })
        .limit(50)
        .lean();

      const conversationsWithMessages = await Promise.all(
        conversations.map(async (conv) => {
          const lastMessage = await Message.findOne({
            conversationId: conv._id,
          })
            .sort({ createdAt: -1 })
            .select("content createdAt")
            .lean();

          const agentName =
            conv.assignedTo && typeof conv.assignedTo === "object"
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
            assignedTo:
              typeof conv.assignedTo === "object"
                ? (conv.assignedTo as any)._id
                : conv.assignedTo,
            assignedAgent: agentName,
            assignedTeam: conv.metadata?.teamId,
            lastMessage: lastMessage
              ? {
                  content: lastMessage.content,
                  createdAt: lastMessage.createdAt,
                }
              : null,
            lastMessageAt: lastMessage?.createdAt || conv.createdAt,
          };
        }),
      );

      logger.info(
        `Retrieved ${conversationsWithMessages.length} conversations for sessionId: ${sessionId}`,
      );

      sendResponse(res, 200, true, "Conversations retrieved successfully", {
        conversations: conversationsWithMessages,
        total: conversationsWithMessages.length,
      });
    } catch (error: any) {
      logger.error(`Error fetching widget conversations: ${error.message}`);
      sendError(res, 500, "Failed to fetch conversations");
    }
  },
);

export const deleteConversation = asyncHandler(
  async (req: Request, res: Response) => {
    const { conversationId } = req.params;
    const { sessionId } = req.query;

    if (!sessionId || typeof sessionId !== "string") {
      return sendError(res, 400, "Session ID is required");
    }

    try {
      const conversation = await Conversation.findOne({
        _id: conversationId,
        "visitor.sessionId": sessionId,
        "metadata.source": "widget",
      });

      if (!conversation) {
        return sendError(res, 404, "Conversation not found");
      }

      // Soft-delete: mark as closed so it disappears from the visitor's list
      await Conversation.findByIdAndUpdate(conversationId, {
        $set: { status: "closed", closedAt: new Date() },
      });

      logger.info(`Widget conversation ${conversationId} closed by visitor`);

      return sendResponse(res, 200, true, "Conversation deleted successfully", {});
    } catch (error: any) {
      logger.error(`Error deleting widget conversation: ${error.message}`);
      return sendError(res, 500, "Failed to delete conversation");
    }
  },
);

export const getUploadUrl = asyncHandler(
  async (req: Request, res: Response) => {
    const { fileName, mimeType } = req.body;
    if (!fileName || !mimeType) {
      return sendError(res, 400, "fileName and mimeType are required");
    }
    const allowed = [
      "image/jpeg", "image/png", "image/gif", "image/webp",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
    ];
    if (!allowed.includes(mimeType)) {
      return sendError(res, 400, "File type not allowed");
    }
    try {
      const StorageService = (await import("../storage/storage.service")).default;
      const result = await StorageService.generateConversationUploadUrl(fileName, mimeType);
      sendResponse(res, 200, true, "Upload URL generated", result);
    } catch (err: any) {
      sendError(res, 500, err.message || "Failed to generate upload URL");
    }
  },
);

export const getConversationMessages = asyncHandler(
  async (req: Request, res: Response) => {
    const { conversationId } = req.params;
    const { sessionId } = req.query;

    if (!sessionId || typeof sessionId !== "string") {
      return sendError(res, 400, "Session ID is required");
    }

    try {
      const conversation = await Conversation.findOne({
        _id: conversationId,
        "visitor.sessionId": sessionId,
        "metadata.source": "widget",
      });

      if (!conversation) {
        return sendError(res, 404, "Conversation not found");
      }

      const messages = await Message.find({
        conversationId: conversationId,
      })
        .sort({ createdAt: 1 })
        .select("senderId content type metadata createdAt")
        .lean();

      sendResponse(res, 200, true, "Messages retrieved successfully", {
        messages: messages.map((msg) => ({
          content: msg.content,
          type: msg.type,
          sender: msg.metadata?.source === "widget" ? "visitor" : "agent",
          senderId: msg.senderId,
          senderName: msg.metadata?.senderName || "Unknown",
          senderEmail: msg.metadata?.senderEmail,
          timestamp: msg.createdAt,
          createdAt: msg.createdAt,
        })),
        total: messages.length,
      });
    } catch (error: any) {
      logger.error(`Error fetching conversation messages: ${error.message}`);
      sendError(res, 500, "Failed to fetch messages");
    }
  },
);
