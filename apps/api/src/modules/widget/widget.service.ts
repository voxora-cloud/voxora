import crypto from "crypto";
import { Widget } from "@shared/models";
import logger from "@shared/core/logger";
import { buildDefaultWidgetConfig } from "@shared/core/widget-default-config";
import config from "@shared/infra/config";
import jwt from "jsonwebtoken";

type ServiceError = Error & { statusCode?: number };

const LEGACY_DEFAULT_SUGGESTIONS = new Set([
  "get help with a question",
  "learn about services",
  "contact support",
]);

function createServiceError(message: string, statusCode: number): ServiceError {
  const err = new Error(message) as ServiceError;
  err.statusCode = statusCode;
  return err;
}

function normalizeSuggestionText(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function isLegacyDefaultSuggestion(
  text: string,
  source: string,
  knowledgeId: string,
): boolean {
  return (
    source === "manual" &&
    !knowledgeId &&
    LEGACY_DEFAULT_SUGGESTIONS.has(normalizeSuggestionText(text))
  );
}

function withWidgetConfigDefaults(input: any): any {
  const defaults = buildDefaultWidgetConfig();
  const output = { ...input };
  output.appearance = {
    ...defaults.appearance,
    ...(input.appearance || {}),
  };
  delete output.logoUrl;
  delete output.appearance.logoUrl;
  output.behavior = { ...defaults.behavior, ...(input.behavior || {}) };
  output.ai = { ...defaults.ai, ...(input.ai || {}) };
  output.conversation = {
    collectUserInfo: {
      ...defaults.conversation.collectUserInfo,
      ...(input.conversation?.collectUserInfo || {}),
    },
  };
  output.features = { ...defaults.features, ...(input.features || {}) };
  if (Array.isArray(input.suggestions)) {
    const seenTexts = new Set<string>();
    const seenKnowledgeIds = new Set<string>();
    output.suggestions = input.suggestions
      .map((s: any) => {
        const text = String(s.text || "").trim();
        const source = s.source === "faq" ? "faq" : "manual";
        const knowledgeId = String(s.knowledgeId || "").trim();
        const normalizedText = normalizeSuggestionText(text);

        if (
          !text ||
          isLegacyDefaultSuggestion(text, source, knowledgeId) ||
          seenTexts.has(normalizedText) ||
          (knowledgeId && seenKnowledgeIds.has(knowledgeId))
        ) {
          return null;
        }

        seenTexts.add(normalizedText);
        if (knowledgeId) seenKnowledgeIds.add(knowledgeId);

        return {
          text,
          showOutside:
            typeof s.showOutside === "boolean" ? s.showOutside : source === "faq",
          enabled: true,
          source,
          knowledgeId,
        };
      })
      .filter(Boolean)
      .slice(0, 3);
  } else if (!output.suggestions) {
    output.suggestions = defaults.suggestions;
  }
  return output;
}

export class WidgetService {
  private isMobileUserAgent(userAgent?: string): boolean {
    if (!userAgent) return false;
    return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile/i.test(
      userAgent,
    );
  }

  private isQrReferrer(referrer?: string): boolean {
    if (!referrer) return false;

    try {
      const parsed = new URL(referrer);
      const get = (key: string) =>
        (parsed.searchParams.get(key) || "").toLowerCase();

      const source =
        get("source") || get("src") || get("utm_source") || get("entry");
      const medium = get("utm_medium") || get("medium");
      const campaign = get("utm_campaign") || get("campaign");
      const qrFlag = get("qr") || get("is_qr");

      if ([source, medium, campaign].some((v) => v.includes("qr"))) return true;
      if (qrFlag === "1" || qrFlag === "true" || qrFlag === "yes") return true;

      return /\bqr\b|qrcode/.test(parsed.pathname.toLowerCase());
    } catch {
      return /[?&](source|src|utm_source|entry)=qr\b|[?&](qr|is_qr)=(1|true|yes)\b/i.test(
        referrer,
      );
    }
  }

  shouldTrackMobileQrPageOpen(userAgent?: string, referrer?: string): boolean {
    return this.isMobileUserAgent(userAgent) && this.isQrReferrer(referrer);
  }

  async generateWidgetToken(
    InteraOnePublicKey: string,
    origin?: string,
    requestOrigin?: string,
  ) {
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
      .select(
        "organizationId displayName backgroundColor appearance behavior ai conversation features suggestions",
      )
      .lean();

    if (!widget) {
      throw createServiceError("Widget not found", 404);
    }

    const defaults = buildDefaultWidgetConfig();
    const { logoUrl: _ignoredLogoUrl, ...appearance } =
      (widget as any).appearance || {};

    return {
      organizationId: (widget as any).organizationId,
      config: {
        displayName: (widget as any).displayName,
        appearance: {
          ...defaults.appearance,
          ...appearance,
        },
        backgroundColor:
          (widget as any).backgroundColor || defaults.backgroundColor,
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
              .map((s: any) => ({
                text: String(s.text || "").trim(),
                showOutside: Boolean(s.showOutside),
                enabled: true,
                source: s.source === "faq" ? "faq" : "manual",
                knowledgeId: String(s.knowledgeId || ""),
              }))
              .filter(
                (s: any) =>
                  s.text &&
                  !isLegacyDefaultSuggestion(s.text, s.source, s.knowledgeId),
              )
              .slice(0, 3)
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
    const hasLegacySuggestions =
      Array.isArray((widget as any).suggestions) &&
      (widget as any).suggestions.some((s: any) =>
        isLegacyDefaultSuggestion(
          String(s.text || ""),
          s.source === "faq" ? "faq" : "manual",
          String(s.knowledgeId || ""),
        ),
      );
    const needsBackfill =
      !widget.appearance ||
      !widget.behavior ||
      !widget.ai ||
      !widget.conversation ||
      !widget.features ||
      hasLegacySuggestions;

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
    const normalizedUpdateData = withWidgetConfigDefaults(updateData || {});
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

    let widget = await Widget.findOneAndUpdate(
      { organizationId },
      cleanUpdates,
      {
        new: true,
        runValidators: true,
      },
    );

    if (!widget) {
      widget = new Widget({
        organizationId,
        displayName: normalizedUpdateData.displayName || "InteraOne AI",
        appearance: normalizedUpdateData.appearance,
        behavior: normalizedUpdateData.behavior,
        ai: normalizedUpdateData.ai,
        conversation: normalizedUpdateData.conversation,
        features: normalizedUpdateData.features,
        suggestions: normalizedUpdateData.suggestions,
        publicKey: crypto.randomBytes(16).toString("hex"),
      });
      await widget.save();
    }

    return widget;
  }
}
