import mongoose, { Document, Schema, Types } from "mongoose";
import { IOrganization } from "./Organization";

export interface IWidget extends Document {
  organizationId: Types.ObjectId | IOrganization;
  displayName: string;
  logoUrl?: string;
  backgroundColor: string;
  publicKey?: string;
}

const WidgetSchema = new Schema<IWidget>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, unique: true },
    displayName: { type: String, required: true },
    logoUrl: { type: String, required: false, default: "" },
    backgroundColor: { type: String, required: true },
    publicKey: { type: String, default: null },
  },
  { timestamps: true },
);

export const Widget = mongoose.model<IWidget>("Widget", WidgetSchema);
