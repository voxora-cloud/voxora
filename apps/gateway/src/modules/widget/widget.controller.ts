import { Request, Response } from "express";
import { sendResponse, sendError, asyncHandler } from "@shared/core/response";
import { Conversation, Message } from "@shared/models";
import logger from "@shared/core/logger";
import { tracker } from "@shared/utils/tracker";
import { AuthenticatedRequest } from "@shared/security/middleware";
import { WidgetService } from "./widget.service";

const widgetService = new WidgetService();

const WIDGET_CONVERSATION_SOURCES = ["widget", "qr", "link"];

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
      const requestOrigin = req.get("origin") || req.get("referer") || undefined;
      const data = await widgetService.getWidgetConfigByPublicKey(InteraOnePublicKey || "", requestOrigin);

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

export const verifyDomain = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await widgetService.verifyWidgetDomain(req.user.activeOrganizationId);
    sendResponse(res, 200, true, "Domain verified successfully", result);
  } catch (error: any) {
    sendError(
      res,
      error?.statusCode || 500,
      error?.statusCode ? error.message : "Failed to verify domain: " + error.message,
    );
  }
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
      sessionId,
      source,
    } = req.body;

    try {
      if (!message) {
        return sendError(res, 400, "Message is required");
      }

      const widgetSession = (req as any).widgetSession as
        | { organizationId?: string; InteraOnePublicKey?: string }
        | undefined;

      const organizationId = widgetSession?.organizationId;
      if (!organizationId) {
        return sendError(res, 401, "Invalid widget session");
      }

      const result = await widgetService.initConversation({
        organizationId,
        message,
        InteraOnePublicKey: InteraOnePublicKey || widgetSession?.InteraOnePublicKey || undefined,
        sessionId,
        source,
      });

      sendResponse(
        res,
        201,
        true,
        "Conversation initialized successfully",
        result,
      );
    } catch (error: any) {
      logger.error(`Failed to initialize conversation: ${error.message}`);
      sendError(
        res,
        error.statusCode || 500,
        "Failed to initialize conversation: " + error.message,
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
      const widgetSession = (req as any).widgetSession;
      if (!widgetSession || !widgetSession.organizationId) {
        return sendError(res, 401, "Invalid widget session");
      }

      const conversations = await Conversation.find({
        organizationId: widgetSession.organizationId,
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

export const getConversationMessages = asyncHandler(
  async (req: Request, res: Response) => {
    const conversationId = req.params.conversationId as string;
    const { sessionId } = req.query;

    if (!sessionId || typeof sessionId !== "string") {
      return sendError(res, 400, "Session ID is required");
    }

    try {
      const widgetSession = (req as any).widgetSession;
      if (!widgetSession || !widgetSession.organizationId) {
        return sendError(res, 401, "Invalid widget session");
      }

      const conversation = await Conversation.findOne({
        _id: conversationId,
        organizationId: widgetSession.organizationId,
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
