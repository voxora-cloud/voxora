import pdfParse from "pdf-parse";
import mammoth from "mammoth";
import { StringDecoder } from "string_decoder";
import config from "../../../config";
import { minioClient } from "../../../infrastructure/storage/minio.client";
import { ContentStreamItem } from "../ingestion.types";


const TEXT_STREAM_SEGMENT_CHARS = parseInt(
  process.env.INGEST_TEXT_STREAM_SEGMENT_CHARS || "100000",
  10,
);

 
async function fetchBuffer(fileKey: string): Promise<Buffer> {
  const stream = await minioClient.getObject(config.minio.bucket || "", fileKey);
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
}

async function getObjectStream(fileKey: string) {
  return minioClient.getObject(config.minio.bucket || "", fileKey);
}

 
export async function loadDocument(fileKey: string, mimeType: string): Promise<string> {
  const buffer = await fetchBuffer(fileKey);

  if (mimeType === "application/pdf") {
    const data = await pdfParse(buffer);
    if (data.numpages > 25) {
      throw new Error(`PDF exceeds page limit of 25 pages (has ${data.numpages} pages).`);
    }
    return data.text;
  }

  if (
    mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimeType === "application/msword"
  ) {
    const result = await mammoth.extractRawText({ buffer });
    const text = result.value;
    const estPages = Math.ceil(text.length / 3000);
    if (estPages > 25) {
      throw new Error(`Word document exceeds page limit of 25 pages (estimated ${estPages} pages).`);
    }
    return text;
  }

  if (mimeType === "text/plain") {
    const text = buffer.toString("utf-8");
    const estPages = Math.ceil(text.length / 3000);
    if (estPages > 25) {
      throw new Error(`Plain text file exceeds page limit of 25 pages (estimated ${estPages} pages).`);
    }
    return text;
  }

  throw new Error(`Unsupported MIME type for document ingestion: ${mimeType}`);
}

async function* streamPlainTextFromMinio(
  fileKey: string,
): AsyncGenerator<ContentStreamItem> {
  const stream = await getObjectStream(fileKey);
  const decoder = new StringDecoder("utf8");
  let carry = "";
  let segmentIndex = 0;

  for await (const chunk of stream) {
    carry += decoder.write(Buffer.from(chunk));

    while (carry.length >= TEXT_STREAM_SEGMENT_CHARS) {
      const piece = carry.slice(0, TEXT_STREAM_SEGMENT_CHARS).trim();
      carry = carry.slice(TEXT_STREAM_SEGMENT_CHARS);
      if (!piece) continue;
      yield {
        sourceRef: `${fileKey}:segment:${segmentIndex}`,
        text: piece,
        metadata: { segmentIndex },
      };
      segmentIndex += 1;
    }
  }

  carry += decoder.end();
  const remaining = carry.trim();
  if (remaining) {
    yield {
      sourceRef: `${fileKey}:segment:${segmentIndex}`,
      text: remaining,
      metadata: { segmentIndex },
    };
  }
}

export async function* loadDocumentStream(
  fileKey: string,
  mimeType: string,
): AsyncGenerator<ContentStreamItem> {
  if (mimeType === "text/plain") {
    // Pre-verify text file size from MinIO metadata to enforce estimated 25-page limit
    const stat = await minioClient.statObject(config.minio.bucket || "", fileKey);
    const estPages = Math.ceil(stat.size / 3000);
    if (estPages > 25) {
      throw new Error(`Plain text file exceeds page limit of 25 pages (estimated ${estPages} pages).`);
    }
    yield* streamPlainTextFromMinio(fileKey);
    return;
  }

  const text = await loadDocument(fileKey, mimeType);
  if (!text.trim()) return;

  yield {
    sourceRef: fileKey,
    text,
  };
}
