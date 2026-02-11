import { minioClient, VOXORA_BUCKET } from '../config/minio';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger';

export interface PresignedUrlResponse {
  uploadUrl: string;
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

class StorageService {
  /**
   * Generate a presigned URL for uploading a file
   * @param fileName - Original file name
   * @param mimeType - File MIME type
   * @param expiresIn - URL expiration time in seconds (default: 15 minutes)
   * @returns Presigned upload URL and file metadata
   */
  async generatePresignedUploadUrl(
    fileName: string,
    mimeType: string,
    expiresIn: number = 900 // 15 minutes
  ): Promise<PresignedUrlResponse> {
    try {
      // Generate unique file key with original extension
      const fileExtension = fileName.split('.').pop();
      const fileKey = `knowledge/${uuidv4()}.${fileExtension}`;

      // Generate presigned PUT URL
      const uploadUrl = await minioClient.presignedPutObject(
        VOXORA_BUCKET,
        fileKey,
        expiresIn
      );

      logger.info(`Generated presigned upload URL for: ${fileName}`);

      return {
        uploadUrl,
        fileKey,
        fileName,
        expiresIn,
      };
    } catch (error) {
      logger.error('Error generating presigned upload URL:', error);
      throw new Error('Failed to generate upload URL');
    }
  }

  /**
   * Generate a presigned URL for downloading/viewing a file
   * @param fileKey - MinIO object key
   * @param expiresIn - URL expiration time in seconds (default: 1 hour)
   * @returns Presigned download URL
   */
  async generatePresignedDownloadUrl(
    fileKey: string,
    expiresIn: number = 3600 // 1 hour
  ): Promise<string> {
    try {
      const downloadUrl = await minioClient.presignedGetObject(
        VOXORA_BUCKET,
        fileKey,
        expiresIn
      );

      logger.info(`Generated presigned download URL for: ${fileKey}`);
      return downloadUrl;
    } catch (error) {
      logger.error('Error generating presigned download URL:', error);
      throw new Error('Failed to generate download URL');
    }
  }

  /**
   * Delete a file from MinIO storage
   * @param fileKey - MinIO object key
   */
  async deleteFile(fileKey: string): Promise<void> {
    try {
      await minioClient.removeObject(VOXORA_BUCKET, fileKey);
      logger.info(`Deleted file from storage: ${fileKey}`);
    } catch (error) {
      logger.error('Error deleting file:', error);
      throw new Error('Failed to delete file');
    }
  }

  /**
   * Get file metadata from MinIO
   * @param fileKey - MinIO object key
   * @returns File metadata
   */
  async getFileMetadata(fileKey: string): Promise<any> {
    try {
      const stat = await minioClient.statObject(VOXORA_BUCKET, fileKey);
      return {
        size: stat.size,
        etag: stat.etag,
        lastModified: stat.lastModified,
        metaData: stat.metaData,
      };
    } catch (error) {
      logger.error('Error getting file metadata:', error);
      throw new Error('Failed to get file metadata');
    }
  }

  /**
   * Check if a file exists in MinIO storage
   * @param fileKey - MinIO object key
   * @returns True if file exists, false otherwise
   */
  async fileExists(fileKey: string): Promise<boolean> {
    try {
      await minioClient.statObject(VOXORA_BUCKET, fileKey);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * List all files with a specific prefix
   * @param prefix - Object key prefix
   * @returns Array of object keys
   */
  async listFiles(prefix: string = 'knowledge/'): Promise<string[]> {
    try {
      const objectsList: string[] = [];
      const stream = minioClient.listObjects(VOXORA_BUCKET, prefix, true);

      return new Promise((resolve, reject) => {
        stream.on('data', (obj) => {
          if (obj.name) {
            objectsList.push(obj.name);
          }
        });
        stream.on('error', (err) => {
          logger.error('Error listing files:', err);
          reject(err);
        });
        stream.on('end', () => {
          resolve(objectsList);
        });
      });
    } catch (error) {
      logger.error('Error listing files:', error);
      throw new Error('Failed to list files');
    }
  }
}

export default new StorageService();
