import mongoose, { Document, Model, Schema } from "mongoose";

export interface IRecentConversation extends Document {
  organizationId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  conversationId: mongoose.Types.ObjectId;
  openedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const RecentConversationSchema = new Schema<IRecentConversation>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    conversationId: { type: Schema.Types.ObjectId, ref: "Conversation", required: true, index: true },
    openedAt: { type: Date, default: Date.now, required: true },
  },
  {
    timestamps: true,
  }
);

// Indexes
RecentConversationSchema.index({ userId: 1, organizationId: 1, openedAt: -1 });
RecentConversationSchema.index({ userId: 1, conversationId: 1 }, { unique: true });

export const RecentConversation: Model<IRecentConversation> = mongoose.model<IRecentConversation>(
  "RecentConversation",
  RecentConversationSchema
);
