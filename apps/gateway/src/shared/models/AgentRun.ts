import mongoose, { Document, Schema, Types } from "mongoose";

export interface IAgentRunStep {
  toolName: string;
  args: Record<string, any>;
  result: any;
  error?: string;
  timestamp: Date;
}

export interface IAgentRun extends Document {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  conversationId: Types.ObjectId;
  messageId: string;
  steps: IAgentRunStep[];
  duration: number; // in ms
  status: "success" | "failed";
  error?: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const agentRunStepSchema = new Schema<IAgentRunStep>({
  toolName: { type: String, required: true },
  args: { type: Schema.Types.Mixed, default: {} },
  result: { type: Schema.Types.Mixed },
  error: { type: String },
  timestamp: { type: Date, default: Date.now },
});

const agentRunSchema = new Schema<IAgentRun>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    conversationId: { type: Schema.Types.ObjectId, ref: "Conversation", required: true },
    messageId: { type: String, required: true },
    steps: { type: [agentRunStepSchema], default: [] },
    duration: { type: Number, required: true },
    status: { type: String, enum: ["success", "failed"], required: true },
    error: { type: String },
    usage: {
      promptTokens: { type: Number },
      completionTokens: { type: Number },
      totalTokens: { type: Number },
    },
  },
  { timestamps: true },
);

agentRunSchema.index({ organizationId: 1, conversationId: 1, createdAt: -1 });
agentRunSchema.index({ conversationId: 1, createdAt: -1 });

export const AgentRun = mongoose.model<IAgentRun>("AgentRun", agentRunSchema);
