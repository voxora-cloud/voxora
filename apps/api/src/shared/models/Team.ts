import mongoose, { Document, Schema, Types } from "mongoose";
import { IOrganization } from "./Organization";

export interface ITeam extends Document {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId | IOrganization;
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

const teamSchema = new Schema<ITeam>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, required: true, trim: true, maxlength: 500 },
    color: { type: String, default: "#3b82f6", match: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/ },
    isActive: { type: Boolean, default: true },
    agentCount: { type: Number, default: 0, min: 0 },
    onlineAgents: { type: Number, default: 0, min: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

// Name unique within an organization only
teamSchema.index({ organizationId: 1, name: 1 }, { unique: true });
teamSchema.index({ organizationId: 1, isActive: 1 });
teamSchema.index({ createdBy: 1 });

export const Team = mongoose.model<ITeam>("Team", teamSchema);
