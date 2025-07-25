import mongoose, { Document, Schema } from 'mongoose';

export interface IMessage extends Document {
  _id: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: 'text' | 'file' | 'image' | 'system';
  metadata: {
    fileName?: string;
    fileSize?: number;
    fileType?: string;
    fileUrl?: string;
    isEdited?: boolean;
    editedAt?: Date;
    readBy?: Array<{
      userId: string;
      readAt: Date;
    }>;
  };
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<IMessage>({
  conversationId: {
    type: Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true,
  },
  senderId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  content: {
    type: String,
    required: true,
    maxlength: 5000,
  },
  type: {
    type: String,
    enum: ['text', 'file', 'image', 'system'],
    default: 'text',
  },
  metadata: {
    fileName: String,
    fileSize: Number,
    fileType: String,
    fileUrl: String,
    isEdited: {
      type: Boolean,
      default: false,
    },
    editedAt: Date,
    readBy: [{
      userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
      readAt: {
        type: Date,
        default: Date.now,
      },
    }],
  },
  isDeleted: {
    type: Boolean,
    default: false,
  },
  deletedAt: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
});

// Indexes for better query performance
messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ senderId: 1 });
messageSchema.index({ 'metadata.readBy.userId': 1 });

export const Message = mongoose.model<IMessage>('Message', messageSchema);
