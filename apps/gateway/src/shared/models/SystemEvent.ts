import mongoose, { Document, Schema, Types } from "mongoose";

export type EventCategory = "analytics" | "ai_observability" | "agent_execution";

export interface ISystemEvent extends Document {
  organizationId: string;
  category: EventCategory;
  eventType: string;
  conversationId?: string;
  messageId?: string;
  userId?: string;
  agentId?: string;
  widgetId?: string;
  channel?: string;
  eventVersion?: string;

  // Shared execution metrics
  latencyMs?: number;
  tokens?: {
    prompt?: number;
    completion?: number;
    total?: number;
  };
  estimatedCostUsd?: number;

  success: boolean;
  error?: string;

  metadata: Record<string, any>;
  occurredAt: Date;
  createdAt: Date;
}

const systemEventSchema = new Schema<ISystemEvent>(
  {
    organizationId: { type: String, required: true, index: true },
    category: { type: String, required: true, enum: ["analytics", "ai_observability", "agent_execution"], index: true },
    eventType: { type: String, required: true, index: true },
    conversationId: { type: String, index: true },
    messageId: { type: String, index: true },
    userId: { type: String, index: true },
    agentId: { type: String, index: true },
    widgetId: { type: String, index: true },
    channel: { type: String },
    eventVersion: { type: String, default: "1" },

    latencyMs: { type: Number },
    tokens: {
      prompt: { type: Number },
      completion: { type: Number },
      total: { type: Number },
    },
    estimatedCostUsd: { type: Number },

    success: { type: Boolean, required: true, default: true },
    error: { type: String },

    metadata: { type: Schema.Types.Mixed, default: {} },
    occurredAt: { type: Date, required: true, default: Date.now, index: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Optimize indices for aggregations
systemEventSchema.index({ organizationId: 1, category: 1, occurredAt: -1 });
systemEventSchema.index({ organizationId: 1, eventType: 1, occurredAt: -1 });
systemEventSchema.index({ "metadata.provider": 1, "metadata.modelId": 1, occurredAt: -1 });
systemEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 }); // 90 days TTL

export const SystemEvent = mongoose.model<ISystemEvent>("SystemEvent", systemEventSchema);
