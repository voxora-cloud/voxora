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

export interface ContentStreamItem {
  sourceRef: string;
  text: string;
  metadata?: Record<string, unknown>;
}

export interface ProcessIngestionInput {
  organizationId: string;
  documentId: string;
  fileName?: string;
  fileKey?: string;
  metadata?: Record<string, unknown>;
  contentStream: AsyncIterable<ContentStreamItem>;
  batchSize?: number;
  chunkSize?: number;
  chunkOverlap?: number;
  embeddingConcurrency?: number;
  embedRetries?: number;
  retryBaseMs?: number;
}

export interface ProcessIngestionResult {
  unitsProcessed: number;
  chunksTotal: number;
  chunksSucceeded: number;
  chunksFailed: number;
  wordCount: number;
  durationMs: number;
}

