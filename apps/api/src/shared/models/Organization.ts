import mongoose, { Document, Schema, Types } from "mongoose";

export interface IOrganization extends Document {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  plan: "free" | "pro" | "proplus";
  logoUrl?: string;
  whiteLabelEnabled: boolean;

  /** Separate billing contact email (can differ from owner account email) */
  billingEmail?: string;
  /** Current Dodo subscription status */
  subscriptionStatus: "active" | "trialing" | "past_due" | "cancelled" | "unpaid" | null;
  /** When the current trial ends (null = not on trial) */
  trialEndsAt?: Date;
  /** Prevent starting a second trial */
  trialUsed: boolean;
  /** Schedule downgrade at period end instead of immediately */
  cancelAtPeriodEnd: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const organizationSchema = new Schema<IOrganization>(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: /^[a-z0-9-]+$/,
    },
    plan: {
      type: String,
      enum: ["free", "pro", "proplus"],
      default: "free",
    },
    billingEmail: { type: String, trim: true, lowercase: true },
    subscriptionStatus: {
      type: String,
      enum: ["active", "trialing", "past_due", "cancelled", "unpaid", null],
      default: null,
    },
    trialEndsAt: { type: Date, default: null },
    trialUsed: { type: Boolean, default: false },
    cancelAtPeriodEnd: { type: Boolean, default: false },
    logoUrl: { type: String, default: null },
    whiteLabelEnabled: { type: Boolean, default: false },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

organizationSchema.index({ isActive: 1 });

export const Organization = mongoose.model<IOrganization>("Organization", organizationSchema);
