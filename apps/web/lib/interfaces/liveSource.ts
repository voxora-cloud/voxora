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
