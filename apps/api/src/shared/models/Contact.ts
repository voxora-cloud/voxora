import mongoose, { Document, Schema, Types } from "mongoose";
import { IOrganization } from "./Organization";

export type ContactStatus = "active" | "inactive" | "blocked";
export type ContactSource = "ai" | "widget" | "manual";
export type ContactSentiment = "positive" | "neutral" | "negative";

export interface IContactNote {
  id: string;
  author: string;
  content: string;
  createdAt: Date;
}

export interface IContactConversation {
  id: string;
  status: "open" | "pending" | "resolved" | "closed";
  lastMessage: string;
  updatedAt: Date;
}

export interface IContactTimelineEvent {
  id: string;
  label: string;
  timestamp: Date;
  detail?: string;
}

export interface IContactInsights {
  summary: string;
  sentiment: ContactSentiment;
  topics: string[];
}

export interface IContact extends Document {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId | IOrganization;
  sessionId: string;
  conversationId?: Types.ObjectId | null;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  tags: string[];
  status: ContactStatus;
  source: ContactSource;
  lastActivityAt: Date;
  notes: IContactNote[];
  conversations: IContactConversation[];
  timeline: IContactTimelineEvent[];
  insights: IContactInsights;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const contactSchema = new Schema<IContact>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    sessionId: { type: String, required: true, trim: true },
    conversationId: { type: Schema.Types.ObjectId, ref: "Conversation", default: null },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true, maxlength: 40 },
    company: { type: String, trim: true, maxlength: 160 },
    tags: [{ type: String, trim: true, maxlength: 40 }],
    status: {
      type: String,
      enum: ["active", "inactive", "blocked"],
      default: "active",
    },
    source: {
      type: String,
      enum: ["ai", "widget", "manual"],
      default: "ai",
    },
    lastActivityAt: { type: Date, default: Date.now },
    notes: [
      {
        id: { type: String, required: true },
        author: { type: String, required: true },
        content: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    conversations: [
      {
        id: { type: String, required: true },
        status: {
          type: String,
          enum: ["open", "pending", "resolved", "closed"],
          default: "open",
        },
        lastMessage: { type: String, default: "" },
        updatedAt: { type: Date, default: Date.now },
      },
    ],
    timeline: [
      {
        id: { type: String, required: true },
        label: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        detail: { type: String, default: "" },
      },
    ],
    insights: {
      summary: { type: String, default: "No insights yet." },
      sentiment: {
        type: String,
        enum: ["positive", "neutral", "negative"],
        default: "neutral",
      },
      topics: [{ type: String, trim: true, maxlength: 60 }],
    },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

contactSchema.index({ organizationId: 1, sessionId: 1 }, { unique: true });
contactSchema.index({ organizationId: 1, email: 1 }, { sparse: true });
contactSchema.index({ organizationId: 1, lastActivityAt: -1 });

export const Contact = mongoose.model<IContact>("Contact", contactSchema);
