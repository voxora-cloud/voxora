import mongoose, { Document, Schema } from "mongoose";

export type AnalyticsEventType =
  | "message_sent"
  | "fallback_triggered"
  | "widget_load"
  | "knowledge_view"
  | "qr_scan"
  | "conversation_started"
  | "conversation_opened"
  | "conversation_closed"
  | "conversation_resolved"
  | "agent_assigned"
  | "escalation_requested"
  | "escalation_assigned"
  | "ai_response"
  | "ai_token_usage"
  | "agent_first_response";

export type AnalyticsEventChannel = "widget" | "web" | "mobile" | "api" | "qr";

export interface IAnalyticsEvent extends Document {
  organizationId: string;
  conversationId?: string;
  userId?: string;
  agentId?: string;
  widgetId?: string;
  channel?: AnalyticsEventChannel;
  eventVersion?: string;
  type: AnalyticsEventType;
  category: "ai" | "agent" | "system";
  metadata: Record<string, any>;
  occurredAt?: Date;
  createdAt: Date;
}

const analyticsEventSchema = new Schema<IAnalyticsEvent>(
  {
    organizationId: { type: String, required: true, index: true },
    conversationId: { type: String, index: true },
    userId: { type: String, index: true },
    agentId: { type: String, index: true },
    widgetId: { type: String, index: true },
    channel: { type: String, enum: ["widget", "web", "mobile", "api", "qr"] },
    eventVersion: { type: String, default: "1" },
    type: { type: String, required: true, index: true },
    category: { type: String, required: true, enum: ["ai", "agent", "system"], index: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
    occurredAt: { type: Date, default: Date.now, index: true },
    createdAt: { type: Date, default: Date.now, index: true },
  },
  { 
    timestamps: { createdAt: true, updatedAt: false },
    // Capped collection would be nice for high volume, but standard for now
  }
);

// Compound index for efficient aggregation
analyticsEventSchema.index({ organizationId: 1, type: 1, occurredAt: -1 });

export const AnalyticsEvent = mongoose.model<IAnalyticsEvent>("AnalyticsEvent", analyticsEventSchema);
