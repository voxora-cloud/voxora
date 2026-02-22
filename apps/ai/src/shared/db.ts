import mongoose from "mongoose";

let connected = false;

export async function connectDB(): Promise<void> {
  if (connected || mongoose.connection.readyState === 1) {
    connected = true;
    return;
  }
  const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/voxora-chat";
  await mongoose.connect(uri);
  connected = true;
  console.log("[DB] MongoDB connected");
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

export async function setDocStatus(
  documentId: string,
  update: {
    status: "indexing" | "indexed" | "failed";
    wordCount?: number;
    chunkCount?: number;
    lastIndexed?: Date;
    errorMessage?: string;
  },
): Promise<void> {
  await connectDB();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (KnowledgeModel as any).findByIdAndUpdate(documentId, { $set: update });
}
