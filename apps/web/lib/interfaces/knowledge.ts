export type KnowledgeSource = "text" | "pdf" | "docx";
export type KnowledgeStatus = "indexed" | "indexing" | "failed" | "pending" | "queued";

export interface KnowledgeBase {
  _id: string;
  title: string;
  description?: string;
  catalog?: string;
  source: KnowledgeSource | "url"; // "url" is created by realtime sync, not static add
  sourceUrl?: string;
  fileName?: string;
  fileKey?: string;
  content?: string;
  status: KnowledgeStatus;
  lastIndexed?: Date;
  createdAt: Date;
  updatedAt: Date;
  wordCount?: number;
  errorMessage?: string;
}

export interface AddKnowledgeFormData {
  title: string;
  description?: string;
  catalog?: string;
  source: KnowledgeSource;
  content?: string;
  file?: File;
}
