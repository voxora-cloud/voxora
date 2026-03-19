import { Queue, ConnectionOptions } from "bullmq";
import config from "./index";

export interface AIJobData {
  organizationId: string;
  conversationId: string;
  content: string;
  messageId: string;
  /** Display name of the company whose widget initiated the conversation */
  companyName?: string;
  /** teamId for the conversation — used by the AI context builder */
  teamId?: string;
  /** Whether the widget allows escalation to a human agent */
  fallbackToAgent?: boolean;
  /** Which visitor info fields the AI should collect during the conversation */
  collectUserInfo?: {
    name?: boolean;
    email?: boolean;
    phone?: boolean;
  };
}

export interface IngestionJobData {
  documentId: string;
  organizationId: string;
  /** "ingest" (default) | "delete-vectors" — drives worker behaviour */
  jobType?: "ingest" | "delete-vectors";
  /** "text" | "pdf" | "docx" | "url" — drives which path the worker takes */
  source: string;
  fileKey: string;
  mimeType: string;
  fileName: string;
  title: string;
  catalog?: string;
  /** Populated when source === "url" */
  sourceUrl?: string;
  /** Raw text content for source === "text" */
  content?: string;
  /** URL-specific crawl options */
  fetchMode?: "single" | "crawl";
  crawlDepth?: number;
  syncFrequency?: string;
}

const connection: ConnectionOptions = {
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  maxRetriesPerRequest: null,
};

const defaultJobOptions = {
  attempts: 1,
  removeOnComplete: 100,
  removeOnFail: 50,
};

export const aiQueue = new Queue<AIJobData, void, string>("ai-processing", {
  connection,
  defaultJobOptions,
});

export const ingestionQueue = new Queue<IngestionJobData, void, string>(
  "document-ingestion",
  { connection, defaultJobOptions },
);
