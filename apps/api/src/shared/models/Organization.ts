import mongoose, { Document, Schema, Types } from "mongoose";

export interface IOrganization extends Document {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  logoUrl?: string;
  emailSender?: {
    fromEmail?: string;
    fromName?: string;
    domain?: string;
    verified: boolean;
  };
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
    logoUrl: { type: String, default: null },
    emailSender: {
      fromEmail: { type: String, trim: true, lowercase: true },
      fromName: { type: String, trim: true, maxlength: 120 },
      domain: { type: String, trim: true, lowercase: true },
      verified: { type: Boolean, default: false },
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

organizationSchema.index({ slug: 1 }, { unique: true });
organizationSchema.index({ isActive: 1 });

export const Organization = mongoose.model<IOrganization>("Organization", organizationSchema);
