export type KnowledgeSource = "text" | "pdf" | "docx" | "url";
export type KnowledgeStatus = "indexed" | "indexing" | "failed" | "pending";

export interface KnowledgeBase {
  _id: string;
  title: string;
  description?: string;
  catalog?: string;
  source: KnowledgeSource;
  sourceUrl?: string;
  fileName?: string;
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
  url?: string;
}
