import crypto from "crypto";
import { Widget, Conversation } from "@shared/models";
import logger from "@shared/core/logger";
import { buildDefaultWidgetConfig } from "@shared/core/widget-default-config";
import config from "@shared/infra/config";
import jwt from "jsonwebtoken";
import {
  ServiceError,
  AIInteractionSource,
  InitConversationInput,
  InitConversationResult,
} from "./widget.types";
import { tracker } from "@shared/utils/tracker";
import { getSocketManager } from "@sockets/index";

const AI_INTERACTION_SOURCES = new Set<AIInteractionSource>([
  "widget",
  "qr",
  "link",
]);

function normalizeInteractionSource(value: unknown): AIInteractionSource {
  if (typeof value !== "string") return "widget";
  const normalized = value.trim().toLowerCase() as AIInteractionSource;
  return AI_INTERACTION_SOURCES.has(normalized) ? normalized : "widget";
}

function createServiceError(message: string, statusCode: number): ServiceError {
  const err = new Error(message) as ServiceError;
  err.statusCode = statusCode;
  return err;
}

function withWidgetConfigDefaults(input: any, isUpdate = false): any {
  const defaults = buildDefaultWidgetConfig();
  const output = { ...input };

  if (!isUpdate || input.appearance !== undefined) {
    output.appearance = {
      ...defaults.appearance,
      ...(input.appearance || {}),
    };
    delete output.logoUrl;
    delete output.appearance.logoUrl;
  }

  if (!isUpdate || input.behavior !== undefined) {
    output.behavior = { ...defaults.behavior, ...(input.behavior || {}) };
    output.behavior.allowedPageRules = Array.from(
      new Set(
        (Array.isArray(output.behavior.allowedPageRules)
          ? output.behavior.allowedPageRules
          : []
        )
          .map((rule: any) => String(rule || "").trim())
          .filter(Boolean),
      ),
    ).slice(0, 50);
  }

  if (!isUpdate || input.ai !== undefined) {
    output.ai = { ...defaults.ai, ...(input.ai || {}) };
  }

  if (!isUpdate || input.conversation !== undefined) {
    output.conversation = {
      collectUserInfo: {
        ...defaults.conversation.collectUserInfo,
        ...(input.conversation?.collectUserInfo || {}),
      },
    };
  }

  if (!isUpdate || input.features !== undefined) {
    output.features = { ...defaults.features, ...(input.features || {}) };
  }

  if (!isUpdate || input.suggestions !== undefined) {
    if (Array.isArray(input.suggestions)) {
      output.suggestions = input.suggestions.slice(0, 4).map((s: any) => ({
        text: String(s.text || "").trim(),
        showOutside: Boolean(s.showOutside),
      })).filter((s: any) => s.text.length > 0);
    } else if (!output.suggestions) {
      output.suggestions = defaults.suggestions;
    }
  }

  return output;
}

export class WidgetService {
  private isMobileUserAgent(userAgent?: string): boolean {
    if (!userAgent) return false;
    return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile/i.test(userAgent);
  }

  private isQrReferrer(referrer?: string): boolean {
    if (!referrer) return false;

    try {
      const parsed = new URL(referrer);
      const get = (key: string) => (parsed.searchParams.get(key) || "").toLowerCase();

      const source = get("source") || get("src") || get("utm_source") || get("entry");
      const medium = get("utm_medium") || get("medium");
      const campaign = get("utm_campaign") || get("campaign");
      const qrFlag = get("qr") || get("is_qr");

      if ([source, medium, campaign].some((v) => v.includes("qr"))) return true;
      if (qrFlag === "1" || qrFlag === "true" || qrFlag === "yes") return true;

      return /\bqr\b|qrcode/.test(parsed.pathname.toLowerCase());
    } catch {
      return /[?&](source|src|utm_source|entry)=qr\b|[?&](qr|is_qr)=(1|true|yes)\b/i.test(referrer);
    }
  }

  shouldTrackMobileQrPageOpen(userAgent?: string, referrer?: string): boolean {
    return this.isMobileUserAgent(userAgent) && this.isQrReferrer(referrer);
  }

  async generateWidgetToken(InteraOnePublicKey: string, origin?: string, requestOrigin?: string) {
    if (!InteraOnePublicKey) {
      throw createServiceError("InteraOne public key is required", 400);
    }

    const widget = await Widget.findById(InteraOnePublicKey);
    if (!widget) {
      throw createServiceError("Widget not found", 404);
    }

    const widgetPayload = {
      InteraOnePublicKey,
      displayName: widget.displayName || "Unknown Widget",
      organizationId: widget.organizationId,
      origin: origin || requestOrigin || "unknown",
      type: "widget_session",
    };

    const token = jwt.sign(widgetPayload, config.jwt.secret!, {
      expiresIn: "24h",
    });

    return {
      token,
      expiresIn: "24h",
    };
  }

  async getWidgetConfigByPublicKey(InteraOnePublicKey: string) {
    if (!InteraOnePublicKey) {
      throw createServiceError("InteraOne public key is required", 400);
    }

    const widget = await Widget.findById(InteraOnePublicKey)
      .select("organizationId displayName appearance behavior ai conversation features suggestions")
      .lean();

    if (!widget) {
      throw createServiceError("Widget not found", 404);
    }

    const defaults = buildDefaultWidgetConfig();
    const { logoUrl: _ignoredLogoUrl, ...appearance } = (widget as any).appearance || {};

    return {
      organizationId: (widget as any).organizationId,
      config: {
        displayName: (widget as any).displayName,
        appearance: {
          ...defaults.appearance,
          ...appearance,
        },
        behavior: {
          ...defaults.behavior,
          ...((widget as any).behavior || {}),
        },
        ai: {
          ...defaults.ai,
          ...((widget as any).ai || {}),
        },
        conversation: {
          collectUserInfo: {
            ...defaults.conversation.collectUserInfo,
            ...((widget as any).conversation?.collectUserInfo || {}),
          },
        },
        features: {
          ...defaults.features,
          ...((widget as any).features || {}),
        },
        suggestions: Array.isArray((widget as any).suggestions)
          ? (widget as any).suggestions
          : defaults.suggestions,
      },
    };
  }

  async getOrganizationIdByPublicKey(publicKey: string) {
    if (!publicKey) {
      throw createServiceError("Public key is required", 400);
    }

    const widget = await Widget.findById(publicKey)
      .select("organizationId")
      .lean();

    if (!widget) {
      throw createServiceError("Widget not found", 404);
    }

    return (widget as any).organizationId?.toString();
  }

  async createWidget(organizationId: string, widgetData: any) {
    const normalizedWidgetData = withWidgetConfigDefaults(widgetData || {});
    const existingWidget = await Widget.findOne({ organizationId });

    if (existingWidget) {
      return Widget.findOneAndUpdate(
        { organizationId },
        { ...normalizedWidgetData, organizationId },
        { new: true, runValidators: true },
      );
    }

    const widget = new Widget({
      ...normalizedWidgetData,
      organizationId,
    });

    await widget.save();

    logger.info("Widget created successfully", {
      widgetId: widget._id,
      organizationId,
      displayName: widget.displayName,
    });

    return widget;
  }

  async getWidget(organizationId: string) {
    let widget = await Widget.findOne({ organizationId });
    const defaultWidgetConfig = buildDefaultWidgetConfig();

    if (!widget) {
      widget = new Widget({
        organizationId,
        displayName: "InteraOne AI",
        ...defaultWidgetConfig,
        publicKey: crypto.randomBytes(16).toString("hex"),
      });
      await widget.save();
      logger.info(`Auto-created default widget for org ${organizationId}`);
      return widget;
    }

    const normalizedExisting = withWidgetConfigDefaults(widget.toObject());
    const needsBackfill =
      !widget.appearance ||
      !widget.behavior ||
      !widget.ai ||
      !widget.conversation ||
      !widget.features;

    if (needsBackfill) {
      await Widget.updateOne({ _id: widget._id }, normalizedExisting, {
        runValidators: true,
      });
      const refreshedWidget = await Widget.findById(widget._id);
      if (refreshedWidget) widget = refreshedWidget;
    }

    return widget;
  }

  async updateWidget(organizationId: string, updateData: any) {
    const normalizedUpdateData = withWidgetConfigDefaults(updateData || {}, true);
    const allowedUpdates = {
      displayName: normalizedUpdateData.displayName,
      appearance: normalizedUpdateData.appearance,
      behavior: normalizedUpdateData.behavior,
      ai: normalizedUpdateData.ai,
      conversation: normalizedUpdateData.conversation,
      features: normalizedUpdateData.features,
      suggestions: normalizedUpdateData.suggestions,
    };

    const cleanUpdates = Object.fromEntries(
      Object.entries(allowedUpdates).filter(([_, v]) => v !== undefined),
    );

    let widget = await Widget.findOneAndUpdate({ organizationId }, cleanUpdates, {
      new: true,
      runValidators: true,
    });

    if (!widget) {
      widget = new Widget({
        organizationId,
        displayName: normalizedUpdateData.displayName || "InteraOne AI",
        appearance: normalizedUpdateData.appearance,
        behavior: normalizedUpdateData.behavior,
        ai: normalizedUpdateData.ai,
        conversation: normalizedUpdateData.conversation,
        features: normalizedUpdateData.features,
        publicKey: crypto.randomBytes(16).toString("hex"),
      });
      await widget.save();
    }

    return widget;
  }

  async initConversation(input: InitConversationInput): Promise<InitConversationResult> {
    const { organizationId, message, InteraOnePublicKey, sessionId, source } = input;

    const interactionSource = normalizeInteractionSource(source);
    const assignedAgentId: string | null = null;

    const conversation = await Conversation.create({
      organizationId,
      participants: [],
      subject: "New conversation from widget",
      status: "open",
      priority: "medium",
      tags: [],
      assignedTo: assignedAgentId,
      createdBy: undefined,
      visitor: {
        sessionId,
        name: "Anonymous User",
        email: "anonymous@temp.local",
        isAnonymous: true,
        providedInfoAt: undefined,
      },
      metadata: {
        customer: {
          initialMessage: message,
          startedAt: new Date(),
        },
        widgetKey: InteraOnePublicKey || null,
        source: "widget",
        interactionSource,
        department: null,
        routingStrategy: "auto",
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
        isAnonymous: true,
        department: null,
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
        sm.emitToOrg(organizationId.toString(), "new_widget_conversation", payload);
        logger.info(
          `Emitted 'new_widget_conversation' for ${conversation._id} to org ${organizationId}`,
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

    return {
      conversationId: conversation.id,
      sessionId,
      isAnonymous: true,
      assignedTo: assignedAgentId,
      assignedAgent: assignedAgentId,
      metadata: {
        department: null,
        routingStrategy: "auto",
      },
    };
  }
}