export interface DocumentJob {
   
  organizationId: string;
   
  documentId: string;
   
  jobType?: "ingest" | "delete-vectors";
   
  source: "pdf" | "docx" | "text" | "url" | "faq";
   
  fileKey: string;
   
  mimeType: string;
   
  fileName: string;
   
  sourceUrl?: string;
   
  content?: string;
   
  fetchMode?: "single" | "crawl";
   
  crawlDepth?: number;
   
  syncFrequency?: string;
   
  metadata?: Record<string, unknown>;
}

export interface Chunk {
  text: string;
  index: number;
  startPos: number;
  endPos: number;
}
