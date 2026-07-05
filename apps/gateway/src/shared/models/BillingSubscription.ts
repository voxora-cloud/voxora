import mongoose, { Document, Schema } from "mongoose";

export type SubscriptionStatus =
  | "active"
  | "past_due"
  | "cancelled"
  | "unpaid";

export interface IBillingSubscription extends Document {
  organizationId: string;
  provider: "dodo";
  providerId: string;
  plan: "free" | "pro" | "proplus";
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  cancelledAt?: Date;
  trialStart?: Date;
  trialEnd?: Date;
  /** Last processed Dodo webhook event ID (for dedup) */
  lastEventId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const billingSubscriptionSchema = new Schema<IBillingSubscription>(
  {
    organizationId: { type: String, required: true, trim: true },
    provider: { type: String, enum: ["dodo"], default: "dodo" },
    providerId: { type: String, required: true, trim: true },
    plan: {
      type: String,
      enum: ["free", "pro", "proplus"],
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "past_due", "cancelled", "unpaid"],
      default: "active",
    },
    currentPeriodStart: { type: Date, required: true },
    currentPeriodEnd: { type: Date, required: true },
    cancelAtPeriodEnd: { type: Boolean, default: false },
    cancelledAt: { type: Date },
    trialStart: { type: Date },
    trialEnd: { type: Date },
    lastEventId: { type: String, trim: true },
  },
  { timestamps: true },
);

billingSubscriptionSchema.index({ organizationId: 1 }, { unique: true });
billingSubscriptionSchema.index({ provider: 1, providerId: 1 }, { unique: true });

export const BillingSubscription = mongoose.model<IBillingSubscription>(
  "BillingSubscription",
  billingSubscriptionSchema,
);