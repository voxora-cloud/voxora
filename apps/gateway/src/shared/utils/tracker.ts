import { analyticsQueue } from "@shared/infra/queue";
import { AnalyticsEventType, AnalyticsEventChannel } from "../models";
import { logger } from "@shared/core";


interface AnalyticsEventContext {
  conversationId?: string;
  userId?: string;
  agentId?: string;
  widgetId?: string;
  channel?: AnalyticsEventChannel;
  occurredAt?: Date;
  eventVersion?: string;
}

/**
 * Global analytics tracker.
 * Events are added to the platform-analytics queue asynchronously.
 */
export const tracker = {
  trackEvent: (
    organizationId: string,
    type: AnalyticsEventType,
    category: "ai" | "agent" | "system",
    metadata: Record<string, any> = {},
    context: AnalyticsEventContext = {}
  ) => {
    // Enqueue job to offload DB write from the main API process
    analyticsQueue.add(
      type,
      {
        event: type,
        organizationId,
        category,
        metadata,
        conversationId: context.conversationId,
        userId: context.userId,
        agentId: context.agentId,
        widgetId: context.widgetId,
        channel: context.channel,
        occurredAt: context.occurredAt,
        eventVersion: context.eventVersion || "1",
      },
      {
        removeOnComplete: true,
        removeOnFail: false,
      }
    ).catch((err: unknown) => {
      logger.error(`[Tracker] Failed to enqueue event ${type}:`, err);
    });
  },

  /**
   * Helper for tracking message events
   */
  trackMessage: (
    organizationId: string,
    sender: "ai" | "agent",
    metadata: Record<string, any> = {},
    context: AnalyticsEventContext = {},
  ) => {
    tracker.trackEvent(organizationId, "message_sent", sender, metadata, context);
  },

  /**
   * Helper for tracking fallbacks
   */
  trackFallback: (
    organizationId: string,
    metadata: Record<string, any> = {},
    context: AnalyticsEventContext = {},
  ) => {
    tracker.trackEvent(organizationId, "fallback_triggered", "system", metadata, context);
  }
};
