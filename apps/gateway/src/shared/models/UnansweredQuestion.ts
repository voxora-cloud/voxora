import mongoose, { Document, Schema, Types } from "mongoose";
import { IOrganization } from "./Organization";

export interface IUnansweredQuestion extends Document {
  organizationId: Types.ObjectId | IOrganization;
  conversationId: Types.ObjectId;
  contactId?: Types.ObjectId | null;
  question: string;
  normalizedQuestion: string;
  source: "knowledge_gap";
  createdAt: Date;
  updatedAt: Date;
}

const UnansweredQuestionSchema = new Schema<IUnansweredQuestion>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },
    contactId: {
      type: Schema.Types.ObjectId,
      ref: "Contact",
      default: null,
      index: true,
    },
    question: { type: String, required: true, trim: true, maxlength: 2000 },
    normalizedQuestion: { type: String, required: true, trim: true, maxlength: 2000 },
    source: { type: String, enum: ["knowledge_gap"], default: "knowledge_gap", required: true },
  },
  { timestamps: true },
);

UnansweredQuestionSchema.index({
  organizationId: 1,
  conversationId: 1,
  normalizedQuestion: 1,
  createdAt: -1,
});

export const UnansweredQuestion = mongoose.model<IUnansweredQuestion>(
  "UnansweredQuestion",
  UnansweredQuestionSchema,
);
