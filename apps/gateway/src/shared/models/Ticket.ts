import mongoose, { Document, Schema, Types } from "mongoose";
import { IOrganization } from "./Organization";

export type TicketStatus = "open" | "in_progress" | "resolved" | "closed";
export type TicketPriority = "low" | "medium" | "high" | "urgent";
export type TicketSource = "ai" | "agent" | "api";

export interface ITicketNote {
  id: string;
  author: string;
  authorType: "ai" | "agent" | "system";
  content: string;
  createdAt: Date;
}

export interface ITicket extends Document {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId | IOrganization;
  conversationId?: Types.ObjectId | null;
  contactId?: Types.ObjectId | null;
  ticketNumber: string;
  title: string;
  description?: string;
  status: TicketStatus;
  priority: TicketPriority;
  source: TicketSource;
  assignedTo?: Types.ObjectId | null;
  tags: string[];
  notes: ITicketNote[];
  resolvedAt?: Date | null;
  closedAt?: Date | null;
  resolutionNote?: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const ticketNoteSchema = new Schema<ITicketNote>(
  {
    id: { type: String, required: true },
    author: { type: String, required: true },
    authorType: { type: String, enum: ["ai", "agent", "system"], default: "agent" },
    content: { type: String, required: true, maxlength: 5000 },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const ticketSchema = new Schema<ITicket>(
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
      default: null,
      index: true,
    },
    contactId: {
      type: Schema.Types.ObjectId,
      ref: "Contact",
      default: null,
    },
    ticketNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 300 },
    description: { type: String, trim: true, maxlength: 10000 },
    status: {
      type: String,
      enum: ["open", "in_progress", "resolved", "closed"],
      default: "open",
      index: true,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    source: {
      type: String,
      enum: ["ai", "agent", "api"],
      default: "ai",
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    tags: [{ type: String, trim: true, maxlength: 50 }],
    notes: [ticketNoteSchema],
    resolvedAt: { type: Date, default: null },
    closedAt: { type: Date, default: null },
    resolutionNote: { type: String, trim: true, maxlength: 5000 },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

// ─── Indexes ────────────────────────────────────────────────────────────────
ticketSchema.index({ organizationId: 1, status: 1 });
ticketSchema.index({ organizationId: 1, priority: 1 });
ticketSchema.index({ organizationId: 1, createdAt: -1 });
ticketSchema.index({ organizationId: 1, assignedTo: 1 });
ticketSchema.index(
  { organizationId: 1, "metadata.idempotencyKey": 1 },
  {
    unique: true,
    partialFilterExpression: { "metadata.idempotencyKey": { $type: "string" } },
  },
);

// ─── Auto-generate ticketNumber before validation ────────────────────────────
ticketSchema.pre("validate", async function (next) {
  if (!this.isNew) return next();
  if (this.ticketNumber) return next(); // Already set

  // Format: TKT-<orgPrefix>-<timestamp><random>
  const orgPrefix = this.organizationId.toString().slice(-4).toUpperCase();
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 5).toUpperCase();
  this.ticketNumber = `TKT-${orgPrefix}-${ts}${rand}`;
  next();
});

export const Ticket = mongoose.model<ITicket>("Ticket", ticketSchema);
