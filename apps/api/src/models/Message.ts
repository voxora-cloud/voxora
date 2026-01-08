import mongoose, { Document, Schema, Types } from "mongoose";

export interface IMessage extends Document {
  _id: string;
  conversationId: Types.ObjectId;
  senderId: string;
  content: string;
  type: "text" | "file" | "image" | "system";
  metadata: {
    senderName: string;
    senderEmail: string;
    source: string;
  };
  readBy: {
    userId: string;
    readAt: Date;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<IMessage>(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
    },
    senderId: {
      type: String,
    },
    content: {
      type: String,
      required: true,
      maxlength: 5000,
    },
    type: {
      type: String,
      enum: ["text", "file", "image", "system"],
      default: "text",
    },
    metadata: {
      senderName: String,
      senderEmail: String,
      source: String,
    },
    readBy: [
      {
        userId: String,
        readAt: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
  },
);

// Indexes for better query performance
messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ senderId: 1 });
export const Message = mongoose.model<IMessage>("Message", messageSchema);
