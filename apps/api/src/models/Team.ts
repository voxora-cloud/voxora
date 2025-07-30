import mongoose, { Document, Schema,Types } from 'mongoose';

export interface ITeam extends Document {
  _id: string;
  name: string;
  description: string;
  color?: string;
  isActive: boolean;
  agentCount: number;
  onlineAgents: number;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const teamSchema = new Schema<ITeam>({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
    unique: true,
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500,
  },
  color: {
    type: String,
    default: '#3b82f6',
    match: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  agentCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  onlineAgents: {
    type: Number,
    default: 0,
    min: 0,
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true,
});

// Indexes
teamSchema.index({ isActive: 1 });
teamSchema.index({ createdBy: 1 });

export const Team = mongoose.model<ITeam>('Team', teamSchema);
