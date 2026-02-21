/** Shape of a job enqueued by the API onto the "document-ingestion" BullMQ queue */
export interface DocumentJob {
  /** MongoDB ObjectId of the knowledge document record */
  documentId: string;
  /** "ingest" (default) | "delete-vectors" — if delete-vectors, only documentId is needed */
  jobType?: "ingest" | "delete-vectors";
  /** Source type — drives which ingestion path is taken */
  source: "pdf" | "docx" | "text" | "url";
  /** MinIO object key — populated for pdf/docx, empty string for text/url */
  fileKey: string;
  /** MIME type — drives which loader is used */
  mimeType: string;
  /** Original file name / document title */
  fileName: string;
  /** Team that owns this document — used to namespace Qdrant search */
  teamId?: string;
  /** Populated when source === "url" */
  sourceUrl?: string;
  /** Populated when source === "text" */
  content?: string;
  /** "single" | "crawl" — URL fetch strategy */
  fetchMode?: "single" | "crawl";
  /** Max BFS depth when fetchMode === "crawl" */
  crawlDepth?: number;
  /** How often to re-ingest: "manual" | "1hour" | "6hours" | "daily" */
  syncFrequency?: string;
  /** Optional arbitrary metadata forwarded into Qdrant payload */
  metadata?: Record<string, unknown>;
}

export interface Chunk {
  text: string;
  index: number;
  startPos: number;
  endPos: number;
}
