import mongoose, { Document, Schema } from 'mongoose';

export interface IConversation extends Document {
  _id: string;
  participants: string[]; // User IDs
  subject?: string;
  status: 'open' | 'pending' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedTo?: string; // Agent ID
  tags: string[];
  lastMessage?: string; // Message ID
  lastMessageAt: Date;
  createdBy: string; // User ID
  closedAt?: Date;
  closedBy?: string; // User ID
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const conversationSchema = new Schema<IConversation>({
  participants: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  }],
  subject: {
    type: String,
    maxlength: 200,
  },
  status: {
    type: String,
    enum: ['open', 'pending', 'resolved', 'closed'],
    default: 'open',
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
  },
  assignedTo: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  tags: [{
    type: String,
    trim: true,
  }],
  lastMessage: {
    type: Schema.Types.ObjectId,
    ref: 'Message',
  },
  lastMessageAt: {
    type: Date,
    default: Date.now,
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  closedAt: {
    type: Date,
    default: null,
  },
  closedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {},
  },
}, {
  timestamps: true,
});

// Indexes for better query performance
conversationSchema.index({ participants: 1 });
conversationSchema.index({ status: 1, priority: 1 });
conversationSchema.index({ assignedTo: 1, status: 1 });
conversationSchema.index({ createdBy: 1 });
conversationSchema.index({ lastMessageAt: -1 });

export const Conversation = mongoose.model<IConversation>('Conversation', conversationSchema);
