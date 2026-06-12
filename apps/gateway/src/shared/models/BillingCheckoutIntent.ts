import mongoose, { Document, Schema } from "mongoose";

export interface IBillingCheckoutIntent extends Document {
  checkoutSessionId: string;
  organizationId: string;
  userId?: string;
  targetPlan: "pro" | "proplus";
  status: "pending" | "consumed";
  consumedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const billingCheckoutIntentSchema = new Schema<IBillingCheckoutIntent>(
  {
    checkoutSessionId: { type: String, required: true, trim: true, unique: true },
    organizationId: { type: String, required: true, trim: true },
    userId: { type: String, trim: true },
    targetPlan: { type: String, enum: ["pro", "proplus"], required: true },
    status: {
      type: String,
      enum: ["pending", "consumed"],
      default: "pending",
    },
    consumedAt: { type: Date },
  },
  { timestamps: true },
);

billingCheckoutIntentSchema.index({ organizationId: 1, createdAt: -1 });
billingCheckoutIntentSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

export const BillingCheckoutIntent = mongoose.model<IBillingCheckoutIntent>(
  "BillingCheckoutIntent",
  billingCheckoutIntentSchema,
);
