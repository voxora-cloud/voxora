import mongoose, { Document, Schema } from "mongoose";

export type CallType = "llm" | "embedding";
export type AIProviderType = "bedrock" | "ollama" | "huggingface" | "openai";

export interface IAICallEvent extends Document {
  /** ISO timestamp of when the call was made */
  timestamp: Date;
  provider: AIProviderType;
  modelId: string;
  callType: CallType;
  latencyMs: number;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  estimatedCostUsd?: number;
  success: boolean;
  error?: string;
  organizationId?: string;
  conversationId?: string;
  /** Inserted at (managed by Mongoose timestamps) */
  createdAt: Date;
  updatedAt: Date;
}

const aiCallEventSchema = new Schema<IAICallEvent>(
  {
    timestamp: { type: Date, required: true, default: Date.now },
    provider: {
      type: String,
      enum: ["bedrock", "ollama", "huggingface", "openai"],
      required: true,
    },
    modelId: { type: String, required: true },
    callType: { type: String, enum: ["llm", "embedding"], required: true },
    latencyMs: { type: Number, required: true },
    inputTokens: { type: Number },
    outputTokens: { type: Number },
    totalTokens: { type: Number },
    estimatedCostUsd: { type: Number },
    success: { type: Boolean, required: true, default: true },
    error: { type: String },
    organizationId: { type: String, index: true },
    conversationId: { type: String, index: true },
  },
  {
    timestamps: true,
    // Use a TTL-friendly capped-style approach:
    // events older than 90 days are automatically purged
  },
);

// Primary query patterns
aiCallEventSchema.index({ organizationId: 1, timestamp: -1 });
aiCallEventSchema.index({ provider: 1, modelId: 1, timestamp: -1 });
aiCallEventSchema.index({ callType: 1, timestamp: -1 });
aiCallEventSchema.index({ success: 1, timestamp: -1 });

// Auto-expire events after 90 days (TTL index)
aiCallEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

export const AICallEvent = mongoose.model<IAICallEvent>(
  "AICallEvent",
  aiCallEventSchema,
);
