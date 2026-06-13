export interface ConversationTrendRecord {
  createdAt: Date;
  updatedAt: Date;
  closedAt?: Date | null;
  status: "open" | "pending" | "resolved" | "closed";
  metadata?: {
    statusUpdatedAt?: Date | string | null;
  };
}
