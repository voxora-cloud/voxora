import mongoose, { Document, Schema, Types } from "mongoose";
import { IOrganization } from "./Organization";
import { IUser } from "./User";

export interface ITemplate extends Document {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId | IOrganization;
  title: string;
  content: string;
  shortcut?: string;
  category?: string;
  createdBy: Types.ObjectId | IUser;
  createdAt: Date;
  updatedAt: Date;
}

const TemplateSchema = new Schema<ITemplate>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    content: { type: String, required: true, trim: true, maxlength: 5000 },
    shortcut: { type: String, trim: true, maxlength: 60, default: "" },
    category: { type: String, trim: true, maxlength: 80, default: "General" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

TemplateSchema.index({ organizationId: 1, title: 1 });
TemplateSchema.index({ organizationId: 1, shortcut: 1 });

export const Template = mongoose.model<ITemplate>("Template", TemplateSchema);
