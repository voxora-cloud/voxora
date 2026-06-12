import type { Readable } from "stream";

export interface PresignedUrlResponse {
  uploadUrl: string;
  downloadUrl?: string;
  fileKey: string;
  fileName: string;
  expiresIn: number;
}

export interface FileMetadata {
  fileName: string;
  fileSize: number;
  mimeType: string;
  fileKey?: string;
}

export interface ProxyFilePayload {
  contentType: string;
  stream: Readable;
}
