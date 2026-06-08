import { Request, Response } from "express";
import { sendResponse, sendError, asyncHandler } from "@shared/core/response";
import { Conversation, Message } from "@shared/models";
import { getSocketManager } from "@sockets/index";
import logger from "@shared/core/logger";
import { tracker } from "@shared/utils/tracker";
import { AuthenticatedRequest } from "@shared/security/middleware";
import { WidgetService } from "./widget.service";

const widgetService = new WidgetService();

type AIInteractionSource = "widget" | "qr" | "link" | "unknown";
const AI_INTERACTION_SOURCES = new Set<AIInteractionSource>([
  "widget",
  "qr",
  "link",
  "unknown",
]);
const WIDGET_CONVERSATION_SOURCES = ["widget", "qr", "link"];

function normalizeInteractionSource(value: unknown): AIInteractionSource {
  if (typeof value !== "string") return "unknown";
  const normalized = value.trim().toLowerCase() as AIInteractionSource;
  return AI_INTERACTION_SOURCES.has(normalized) ? normalized : "unknown";
}

// ========================
// WIDGET AUTH & CONFIG
// ========================

export const generateWidgetToken = asyncHandler(
  async (req: Request, res: Response) => {
    try {
      const { InteraOnePublicKey, origin } = req.body;
      const data = await widgetService.generateWidgetToken(
        InteraOnePublicKey,
        origin,
        req.get("origin") || undefined,
      );

      sendResponse(res, 200, true, "Widget token generated successfully", {
        token: data.token,
        expiresIn: data.expiresIn,
      });
    } catch (error: any) {
      sendError(
        res,
        error?.statusCode || 500,
        error?.statusCode ? error.message : "Failed to generate widget token: " + error.message,
      );
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
      const { InteraOnePublicKey } = req.query as { InteraOnePublicKey?: string };
      const data = await widgetService.getWidgetConfigByPublicKey(InteraOnePublicKey || "");

      try {
        const organizationId = data.organizationId;
        if (organizationId) {
          const userAgent = req.get("user-agent") || "";
          const referrer = req.get("referer") || req.get("referrer") || "";

          tracker.trackEvent(
            organizationId.toString(),
            "widget_load",
            "system",
            {},
            { widgetId: InteraOnePublicKey, channel: "widget" },
          );

          if (widgetService.shouldTrackMobileQrPageOpen(userAgent, referrer)) {
            tracker.trackEvent(
              organizationId.toString(),
              "qr_scan",
              "system",
              {
                trigger: "mobile_qr_page_open",
              },
              { widgetId: InteraOnePublicKey, channel: "qr" },
            );
          }
        }
      } catch (trackError: any) {
        logger.warn(`Widget tracking failed: ${trackError?.message || trackError}`);
      }

      return sendResponse(res, 200, true, "Widget config fetched", {
        config: data.config,
      });
    } catch (error: any) {
      if (error?.statusCode) {
        return sendError(res, error.statusCode, error.message);
      }
      return sendError(
        res,
        500,
        "Failed to fetch widget config: " + error.message,
      );
    }
  },
);

export const createWidget = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const body = { ...req.body };
  delete body.logoUrl;
  if (body.appearance) delete body.appearance.logoUrl;
  const widget = await widgetService.createWidget(req.user.activeOrganizationId, body);
  sendResponse(res, 201, true, "Widget created successfully", widget);
});

export const getWidget = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const result = await widgetService.getWidget(req.user.activeOrganizationId);
  if (!result) return sendError(res, 404, "Widget not found");
  const widgetData: any = result.toObject ? result.toObject() : { ...result };
  delete widgetData.logoUrl;
  if (widgetData.appearance) delete widgetData.appearance.logoUrl;

  sendResponse(res, 200, true, "Widget retrieved successfully", widgetData);
});

export const updateWidget = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const body = { ...req.body };
  delete body.logoUrl;
  if (body.appearance) delete body.appearance.logoUrl;
  const widget = await widgetService.updateWidget(req.user.activeOrganizationId, body);
  sendResponse(res, 200, true, "Widget updated successfully", widget);
});

export const trackQrScan = asyncHandler(async (req: Request, res: Response) => {
  const { publicKey } = req.body as { publicKey?: string };

  let organizationId: string;
  try {
    organizationId = await widgetService.getOrganizationIdByPublicKey(publicKey || "");
  } catch (error: any) {
    return sendError(res, error?.statusCode || 500, error.message);
  }

  tracker.trackEvent(
    organizationId,
    "qr_scan",
    "system",
    {},
    { widgetId: publicKey, channel: "qr" },
  );

  return sendResponse(res, 200, true, "QR scan tracked", {});
});

// ========================
// WIDGET CONVERSATIONS
// ========================


export const initConversation = asyncHandler(
  async (req: Request, res: Response) => {
    const {
      message,
      InteraOnePublicKey,
      visitorName,
      visitorEmail,
      sessionId,
      source,
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
      const interactionSource = normalizeInteractionSource(source);
      const widgetSession = (req as any).widgetSession as
        | { organizationId?: string; InteraOnePublicKey?: string }
        | undefined;

      const organizationId = widgetSession?.organizationId;
      if (!organizationId) {
        return sendError(res, 401, "Invalid widget session");
      }

      const assignedAgentId: string | null = null;

      // Keep new widget conversations unassigned.
      // Human assignment should happen only after an explicit escalation.

      const conversation = await Conversation.create({
        organizationId,
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
          widgetKey: InteraOnePublicKey || widgetSession?.InteraOnePublicKey || null,
          source: "widget",
          interactionSource,
          department: department || null,
          routingStrategy: department ? "department" : "auto",
        },
      });

      logger.info(
        `New conversation initialized: ${conversation.id} from widget`,
      );

      tracker.trackEvent(
        organizationId.toString(),
        "conversation_started",
        "system",
        {
          isAnonymous,
          department: department || null,
          initialMessageLength: message.length,
          source: interactionSource,
        },
        {
          conversationId: conversation.id,
          widgetId: InteraOnePublicKey,
          channel: interactionSource === "qr" ? "qr" : "widget",
        },
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
            department: department || null,
            routingStrategy: department ? "department" : "auto",
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
    const conversationId = req.params.conversationId as string;
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
        "metadata.source": { $in: WIDGET_CONVERSATION_SOURCES },
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
              conv.assignedTo && typeof conv.assignedTo === "object"
                ? (conv.assignedTo as any)._id
                : conv.assignedTo,
            assignedAgent: agentName,
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
    const conversationId = req.params.conversationId as string;
    const { sessionId } = req.query;

    if (!sessionId || typeof sessionId !== "string") {
      return sendError(res, 400, "Session ID is required");
    }

    try {
      const conversation = await Conversation.findOne({
        _id: conversationId,
        "visitor.sessionId": sessionId,
        "metadata.source": { $in: WIDGET_CONVERSATION_SOURCES },
      });

      if (!conversation) {
        return sendError(res, 404, "Conversation not found");
      }

      // Soft-delete: mark as closed so it disappears from the visitor's list
      await Conversation.findByIdAndUpdate(conversationId, {
        $set: { status: "closed", closedAt: new Date() },
      });

      tracker.trackEvent(
        conversation.organizationId.toString(),
        "conversation_closed",
        "system",
        { reason: "visitor_closed" },
        { conversationId, channel: "widget" },
      );

      logger.info(`Widget conversation ${conversationId} closed by visitor`);

      return sendResponse(res, 200, true, "Conversation deleted successfully", {});
    } catch (error: any) {
      logger.error(`Error deleting widget conversation: ${error.message}`);
      return sendError(res, 500, "Failed to delete conversation");
    }
  },
);


export const getConversationMessages = asyncHandler(
  async (req: Request, res: Response) => {
    const conversationId = req.params.conversationId as string;
    const { sessionId } = req.query;

    if (!sessionId || typeof sessionId !== "string") {
      return sendError(res, 400, "Session ID is required");
    }

    try {
      const conversation = await Conversation.findOne({
        _id: conversationId,
        "visitor.sessionId": sessionId,
        "metadata.source": { $in: WIDGET_CONVERSATION_SOURCES },
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
