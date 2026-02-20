import * as Minio from "minio";
import { config } from "./index";
import logger from "../utils/logger";
export const minioClient = new Minio.Client({
  endPoint: config.minio.endpoint,
  port: config.minio.port,
  useSSL: config.minio.useSSL,
  accessKey: config.minio.accessKey,
  secretKey: config.minio.secretKey,
});

export const VOXORA_BUCKET = config.minio.bucketName;

export const initializeMinIO = async (): Promise<void> => {
  try {
    const bucketExists = await minioClient.bucketExists(VOXORA_BUCKET);

    if (!bucketExists) {
      await minioClient.makeBucket(VOXORA_BUCKET, "us-east-1");
      logger.info(`MinIO bucket created: ${VOXORA_BUCKET}`);

      const policy = {
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Principal: { AWS: ["*"] },
            Action: ["s3:GetObject"],
            Resource: [`arn:aws:s3:::${VOXORA_BUCKET}/*`],
          },
        ],
      };

      await minioClient.setBucketPolicy(VOXORA_BUCKET, JSON.stringify(policy));
      logger.info(`MinIO bucket policy set for: ${VOXORA_BUCKET}`);
    } else {
      logger.info(`MinIO bucket already exists: ${VOXORA_BUCKET}`);
    }
  } catch (error) {
    logger.error("Error initializing MinIO:", error);
    throw error;
  }
};

export default minioClient;
