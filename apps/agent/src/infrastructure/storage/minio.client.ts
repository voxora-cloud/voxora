import { Client as MinioClient } from "minio";
import config from "../../config";

export const minioClient = new MinioClient({
  endPoint: config.minio.endpoint || "localhost",
  port: config.minio.port,
  useSSL: config.minio.useSSL,
  accessKey: config.minio.accessKey || "",
  secretKey: config.minio.secretKey || "",
});