import { Client as MinioClient } from "minio";
import pdfParse from "pdf-parse";
import mammoth from "mammoth";
import config from "../config";

const minio = new MinioClient({
  endPoint: config.minio.endpoint,
  port: config.minio.port,
  useSSL: config.minio.useSSL,
  accessKey: config.minio.accessKey,
  secretKey: config.minio.secretKey,
});

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
