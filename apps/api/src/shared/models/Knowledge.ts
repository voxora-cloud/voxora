import mongoose, { Document, Schema } from "mongoose";

export type KnowledgeSource = "pdf" | "docx" | "text" | "url";
export type KnowledgeStatus = "pending" | "queued" | "indexing" | "indexed" | "failed";

export interface IKnowledge extends Document {
  title: string;
  description?: string;
  catalog?: string;
  source: KnowledgeSource;
  status: KnowledgeStatus;
  // File-based
  fileName?: string;
  fileKey?: string;
  fileSize?: number;
  mimeType?: string;
  // Text/URL
  content?: string;
  sourceUrl?: string;
  // Indexing meta
  wordCount?: number;
  chunkCount?: number;
  lastIndexed?: Date;
  errorMessage?: string;
  // Ownership
  teamId?: string;
  uploadedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const KnowledgeSchema = new Schema<IKnowledge>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    catalog: { type: String, trim: true },
    source: {
      type: String,
      enum: ["pdf", "docx", "text", "url"],
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "queued", "indexing", "indexed", "failed"],
      default: "pending",
    },
    fileName: { type: String },
    fileKey: { type: String },
    fileSize: { type: Number },
    mimeType: { type: String },
    content: { type: String },
    sourceUrl: { type: String },
    wordCount: { type: Number },
    chunkCount: { type: Number },
    lastIndexed: { type: Date },
    errorMessage: { type: String },
    teamId: { type: String },
    uploadedBy: { type: String, required: true },
  },
  { timestamps: true },
);

KnowledgeSchema.index({ teamId: 1, status: 1 });
KnowledgeSchema.index({ catalog: 1 });

export const Knowledge = mongoose.model<IKnowledge>("Knowledge", KnowledgeSchema);
