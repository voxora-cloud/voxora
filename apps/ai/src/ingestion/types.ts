/** Shape of a job enqueued by the API onto the "document-ingestion" BullMQ queue */
export interface DocumentJob {
  /** MongoDB ObjectId of the knowledge document record */
  documentId: string;
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
  /** Optional arbitrary metadata forwarded into Qdrant payload */
  metadata?: Record<string, unknown>;
}

export interface Chunk {
  text: string;
  index: number;
  startPos: number;
  endPos: number;
}
