export interface RequestFileUploadInput {
  title: string;
  description?: string;
  catalog?: string;
  source: "pdf" | "docx";
  fileName: string;
  fileSize: number;
  mimeType: string;
}

export interface CreateTextEntryInput {
  title: string;
  description?: string;
  catalog?: string;
  source: "text" | "url" | "faq";
  content?: string;
  url?: string;
  fetchMode?: "single" | "crawl";
  crawlDepth?: number;
  syncFrequency?: string;
}

export interface UpdateKnowledgeItemInput {
  isPaused?: boolean;
  syncFrequency?: "manual" | "1hour" | "6hours" | "daily";
  status?: "queued" | "indexed" | "failed" | "pending";
}
