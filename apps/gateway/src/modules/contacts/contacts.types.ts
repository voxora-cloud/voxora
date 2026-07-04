export interface ListContactsOptions {
  search?: string;
  limit?: number;
}

export interface UpsertFromAIInput {
  organizationId: string;
  conversationId: string;
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  tags?: string[];
  note?: string;
  sentiment?: "positive" | "neutral" | "negative";
  summary?: string;
  topics?: string[];
}
