import { Client as MinioClient } from "minio";
import pdfParse from "pdf-parse";
import mammoth from "mammoth";
import { StringDecoder } from "string_decoder";
import config from "../../../config";
import { ContentStreamItem } from "../services/content-stream";

const minio = new MinioClient({
  endPoint: config.minio.endpoint,
  port: config.minio.port,
  useSSL: config.minio.useSSL,
  accessKey: config.minio.accessKey,
  secretKey: config.minio.secretKey,
});

const TEXT_STREAM_SEGMENT_CHARS = parseInt(
  process.env.INGEST_TEXT_STREAM_SEGMENT_CHARS || "100000",
  10,
);

/** Download a buffer from MinIO */
async function fetchBuffer(fileKey: string): Promise<Buffer> {
  const stream = await minio.getObject(config.minio.bucket, fileKey);
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
}

async function getObjectStream(fileKey: string) {
  return minio.getObject(config.minio.bucket, fileKey);
}

/** Extract plain text from the document buffer based on MIME type */
export async function loadDocument(fileKey: string, mimeType: string): Promise<string> {
  const buffer = await fetchBuffer(fileKey);

  if (mimeType === "application/pdf") {
    const data = await pdfParse(buffer);
    return data.text;
  }

  if (
    mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimeType === "application/msword"
  ) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  if (mimeType === "text/plain") {
    return buffer.toString("utf-8");
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
