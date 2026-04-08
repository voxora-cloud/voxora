import mongoose from "mongoose";

let connected = false;

export async function connectDB(): Promise<void> {
  if (connected || mongoose.connection.readyState === 1) {
    connected = true;
    return;
  }
  const uri =
    process.env.MONGODB_URI ||
    "mongodb://admin:dev123@localhost:27017/voxora-chat-dev?authSource=admin";
  await mongoose.connect(uri);
  connected = true;
  console.log(
    `[DB] MongoDB connected (db=${mongoose.connection.name || "unknown"})`,
  );
}

/**
 * Minimal schema — strict:false lets us update only the fields we care about
 * without re-declaring the full Knowledge schema here.
 */
const KnowledgeSchema = new mongoose.Schema({}, { strict: false });

export const KnowledgeModel =
  (mongoose.models["Knowledge"] as mongoose.Model<mongoose.Document> | undefined) ??
  mongoose.model("Knowledge", KnowledgeSchema);

/**
 * Minimal Message schema — strict:false allows reading all fields without
 * duplicating the full schema from apps/api.
 */
const MessageSchema = new mongoose.Schema({}, { strict: false, timestamps: true });

export const MessageModel =
  (mongoose.models["Message"] as mongoose.Model<mongoose.Document> | undefined) ??
  mongoose.model("Message", MessageSchema);

/**
 * Minimal Conversation schema for AI-side updates of visitor/contact metadata.
 */
const ConversationSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, required: true },
    visitor: {
      sessionId: { type: String },
      name: { type: String },
      email: { type: String },
      isAnonymous: { type: Boolean },
      providedInfoAt: { type: Date },
    },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { strict: false, timestamps: true },
);

export const ConversationModel =
  (mongoose.models["Conversation"] as mongoose.Model<mongoose.Document> | undefined) ??
  mongoose.model("Conversation", ConversationSchema);

/**
 * Minimal Contact schema for AI-side upsert.
 */
const ContactSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    sessionId: { type: String, required: true, index: true },
    conversationId: { type: mongoose.Schema.Types.ObjectId, default: null },
    name: { type: String, required: true },
    email: { type: String },
    phone: { type: String },
    status: { type: String, default: "active" },
    source: { type: String, default: "ai" },
    tags: [{ type: String }],
    lastActivityAt: { type: Date, default: Date.now },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { strict: false, timestamps: true },
);

export const ContactModel =
  (mongoose.models["Contact"] as mongoose.Model<mongoose.Document> | undefined) ??
  mongoose.model("Contact", ContactSchema);

export function buildKnowledgeLookupFilter(
  documentId: string,
  organizationId?: string,
): Record<string, unknown> {
  const filter: Record<string, unknown> = {
    _id: mongoose.Types.ObjectId.isValid(documentId)
      ? { $in: [documentId, new mongoose.Types.ObjectId(documentId)] }
      : documentId,
  };

  if (organizationId) {
    filter.organizationId = mongoose.Types.ObjectId.isValid(organizationId)
      ? { $in: [organizationId, new mongoose.Types.ObjectId(organizationId)] }
      : organizationId;
  }

  return filter;
}

export async function setDocStatus(
  organizationId: string,
  documentId: string,
  update: {
    status: "indexing" | "indexed" | "completed" | "failed";
    wordCount?: number;
    chunkCount?: number;
    lastIndexed?: Date;
    errorMessage?: string;
    failedChunkCount?: number;
    totalChunkCount?: number;
  },
): Promise<void> {
  await connectDB();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (KnowledgeModel as any).findOneAndUpdate(
    buildKnowledgeLookupFilter(documentId, organizationId),
    { $set: update },
  );
}
