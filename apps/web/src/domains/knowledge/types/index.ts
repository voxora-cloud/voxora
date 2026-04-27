export type KnowledgeSource = "text" | "pdf" | "docx" | "url" | "table";
export type KnowledgeStatus = "indexed" | "indexing" | "failed" | "pending" | "queued";
export type AddKnowledgeSource = "text" | "pdf" | "docx" | "table";

export interface KnowledgeTableData {
  columns: string[];
  rows: string[][];
}

export interface KnowledgeBase {
  _id: string;
  title: string;
  description?: string;
  catalog?: string;
  source: KnowledgeSource;
  sourceUrl?: string;
  fileName?: string;
  fileKey?: string;
  content?: string;
  status: KnowledgeStatus;
  isPaused?: boolean;
  syncFrequency?: SyncFrequency;
  fetchMode?: FetchMode;
  crawlDepth?: number;
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
  source: AddKnowledgeSource;
  content?: string;
  file?: File;
  table?: KnowledgeTableData;
}

export interface KnowledgeUploadRequest {
  title: string;
  description?: string;
  catalog?: string;
  source: "pdf" | "docx";
  fileName: string;
  fileSize?: number;
  mimeType: string;
}

export interface KnowledgeCreatePayload {
  title: string;
  description?: string;
  catalog?: string;
  source: "text" | "url" | "table";
  content?: string;
  url?: string;
  fetchMode?: FetchMode;
  crawlDepth?: number;
  syncFrequency?: SyncFrequency;
}

export interface KnowledgeUpdatePayload {
  isPaused?: boolean;
  syncFrequency?: SyncFrequency;
  status?: KnowledgeStatus;
  content?: string;
}

export type FetchMode = "single" | "crawl";
export type SyncFrequency = "manual" | "1hour" | "6hours" | "daily";
export type SourceStatus = "synced" | "fetching" | "failed" | "pending";
export type SourceType = "website" | "page" | "blog" | "docs";

export interface LiveSource {
  _id: string;
  url: string;
  type: SourceType;
  fetchMode: FetchMode;
  crawlDepth?: number;
  syncFrequency: SyncFrequency;
  status: SourceStatus;
  lastFetch?: Date;
  nextFetch?: Date;
  changesSummary?: string;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
  isPaused?: boolean;
}

export interface AddLiveSourceFormData {
  url: string;
  fetchMode: FetchMode;
  crawlDepth?: number;
  syncFrequency: SyncFrequency;
}


export interface KnowledgeListResponse {
  success: boolean;
  data: { items: KnowledgeBase[]; total: number };
}

export interface KnowledgeItemResponse {
  success: boolean;
  data: KnowledgeBase;
}

export interface KnowledgeUploadResponse {
  success: boolean;
  data: { documentId: string; presignedUrl: string; fileKey: string };
}

export interface KnowledgeViewUrlResponse {
  success: boolean;
  data: { url: string; fileName?: string; mimeType?: string };
}

export interface DeleteResponse {
  success: boolean;
}
