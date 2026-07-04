import mongoose, { Document, Schema, Types } from "mongoose";

export interface IContactConflict extends Document {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  contactId: Types.ObjectId;
  field: "name" | "phone" | "company";
  currentValue: string;
  proposedValue: string;
  conversationId: Types.ObjectId;
  status: "pending" | "resolved" | "dismissed";
  resolvedAt?: Date;
  resolvedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const contactConflictSchema = new Schema<IContactConflict>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    contactId: { type: Schema.Types.ObjectId, ref: "Contact", required: true },
    field: { type: String, enum: ["name", "phone", "company"], required: true },
    currentValue: { type: String, default: "" },
    proposedValue: { type: String, required: true },
    conversationId: { type: Schema.Types.ObjectId, ref: "Conversation", required: true },
    status: {
      type: String,
      enum: ["pending", "resolved", "dismissed"],
      default: "pending",
    },
    resolvedAt: { type: Date },
    resolvedBy: { type: String },
  },
  { timestamps: true }
);

contactConflictSchema.index({ organizationId: 1, status: 1 });
contactConflictSchema.index({ contactId: 1, field: 1, proposedValue: 1, status: 1 });

export const ContactConflict = mongoose.model<IContactConflict>(
  "ContactConflict",
  contactConflictSchema
);
