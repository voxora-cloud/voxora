import mongoose, { Document, Schema } from "mongoose";

export interface IBillingWebhookEvent extends Document {
  provider: string;
  eventId: string;
  eventType: string;
  organizationId?: string;
  targetPlan?: "pro" | "proplus";
  status: "processing" | "processed" | "ignored" | "failed";
  rawPayload: unknown;
  errorMessage?: string;
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const billingWebhookEventSchema = new Schema<IBillingWebhookEvent>(
  {
    provider: { type: String, required: true, trim: true },
    eventId: { type: String, required: true, trim: true },
    eventType: { type: String, required: true, trim: true },
    organizationId: { type: String, trim: true },
    targetPlan: { type: String, enum: ["pro", "proplus"] },
    status: {
      type: String,
      enum: ["processing", "processed", "ignored", "failed"],
      default: "processing",
    },
    rawPayload: { type: Schema.Types.Mixed, required: true },
    errorMessage: { type: String, trim: true },
    processedAt: { type: Date },
  },
  { timestamps: true },
);

billingWebhookEventSchema.index({ provider: 1, eventId: 1 }, { unique: true });
billingWebhookEventSchema.index({ organizationId: 1, createdAt: -1 });

export const BillingWebhookEvent = mongoose.model<IBillingWebhookEvent>(
  "BillingWebhookEvent",
  billingWebhookEventSchema,
);
