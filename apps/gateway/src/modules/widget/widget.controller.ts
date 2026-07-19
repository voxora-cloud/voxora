import { Request, Response } from "express";
import { sendResponse, sendError, asyncHandler } from "@shared/core/response";
import { Conversation, Message, Contact } from "@shared/models";
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

export const listDomains = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const domains = await widgetService.listWidgetDomains(
      req.user.activeOrganizationId,
    );
    sendResponse(
      res,
      200,
      true,
      "Widget domains retrieved successfully",
      domains,
    );
  },
);

export const addDomain = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const domain = await widgetService.addWidgetDomain(
        req.user.activeOrganizationId,
        req.body.domain,
      );
      sendResponse(res, 201, true, "Widget domain added successfully", domain);
    } catch (error: any) {
      sendError(res, error?.statusCode || 500, error.message);
    }
  },
);

export const updateDomain = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const domain = await widgetService.updateWidgetDomain(
        req.user.activeOrganizationId,
        String(req.params.domainId),
        req.body,
      );
      sendResponse(
        res,
        200,
        true,
        "Widget domain updated successfully",
        domain,
      );
    } catch (error: any) {
      sendError(res, error?.statusCode || 500, error.message);
    }
  },
);

export const removeDomain = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const domains = await widgetService.removeWidgetDomain(
        req.user.activeOrganizationId,
        String(req.params.domainId),
      );
      sendResponse(
        res,
        200,
        true,
        "Widget domain removed successfully",
        domains,
      );
    } catch (error: any) {
      sendError(res, error?.statusCode || 500, error.message);
    }
  },
);

export const verifyDomainById = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const result = await widgetService.verifyWidgetDomain(
        req.user.activeOrganizationId,
        String(req.params.domainId),
      );
      sendResponse(res, 200, true, "Domain verified successfully", result);
    } catch (error: any) {
      sendError(res, error?.statusCode || 500, error.message);
    }
  },
);

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

      const conversationsWithMessages = await widgetService.getWidgetConversations(
        widgetSession.organizationId,
        sessionId,
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
      sendError(
        res,
        error.statusCode || 500,
        error.message || "Failed to fetch conversations",
      );
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

      const messages = await widgetService.getConversationMessages(
        widgetSession.organizationId,
        conversationId,
        sessionId,
      );

      sendResponse(res, 200, true, "Messages retrieved successfully", {
        messages,
        total: messages.length,
      });
    } catch (error: any) {
      logger.error(`Error fetching conversation messages: ${error.message}`);
      sendError(
        res,
        error.statusCode || 500,
        error.message || "Failed to fetch messages",
      );
    }
  },
);
