import mongoose, { Document, Schema } from "mongoose";

export interface IUsageRecord extends Document {
  organizationId: string;
  /** ISO year-month string, e.g. "2025-04" */
  period: string;
  /** Total AI/widget messages sent this period */
  messagesUsed: number;
  /** When this period resets (start of next billing cycle) */
  resetAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const usageRecordSchema = new Schema<IUsageRecord>(
  {
    organizationId: { type: String, required: true, trim: true },
    period: { type: String, required: true, trim: true },
    messagesUsed: { type: Number, default: 0, min: 0 },
    resetAt: { type: Date, required: true },
  },
  { timestamps: true },
);

usageRecordSchema.index({ organizationId: 1, period: 1 }, { unique: true });
usageRecordSchema.index({ resetAt: 1 });

export const UsageRecord = mongoose.model<IUsageRecord>("UsageRecord", usageRecordSchema);
