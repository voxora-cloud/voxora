import mongoose, { Document, Model, Schema } from "mongoose";

export interface INotification extends Document {
  organizationId: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId;
  type: "assignment" | "ai_sync" | "administrative" | "system" | "billing";
  title: string;
  description: string;
  isRead: boolean;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    type: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    isRead: { type: Boolean, default: false, index: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true,
  }
);

// Indexes for common queries
NotificationSchema.index({ organizationId: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ organizationId: 1, isRead: 1 });

export const Notification: Model<INotification> = mongoose.model<INotification>(
  "Notification",
  NotificationSchema
);
