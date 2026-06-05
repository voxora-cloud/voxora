import { apiClient } from "@/shared/lib/api-client";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3002/api/v1";

interface PresignedUploadResponse {
  success: boolean;
  data: {
    uploadUrl: string;
    fileKey: string;
    fileName: string;
    expiresIn: number;
  };
}

interface PresignedDownloadResponse {
  success: boolean;
  data: {
    downloadUrl: string;
    fileKey: string;
  };
}

interface DeleteStorageResponse {
  success: boolean;
  data: { fileKey: string };
}

export const storageApi = {
  getProxyFileUrl: (fileKey: string) =>
    `${API_URL}/storage/file?key=${encodeURIComponent(fileKey)}`,

  generatePresignedUploadUrl: (
    fileName: string,
    mimeType: string,
    expiresIn?: number,
  ) =>
    apiClient.post<PresignedUploadResponse>("/storage/presigned-upload", {
      fileName,
      mimeType,
      expiresIn,
    }),

  generatePresignedDownloadUrl: (fileKey: string, expiresIn?: number) =>
    apiClient.post<PresignedDownloadResponse>("/storage/presigned-download", {
      fileKey,
      expiresIn,
    }),

  deleteStorageFile: (fileKey: string) =>
    apiClient.delete<DeleteStorageResponse>(
      `/storage/${encodeURIComponent(fileKey)}`,
    ),

  uploadFileWithPresignedUrl: async (
    presignedUrl: string,
    file: File,
  ): Promise<void> => {
    const response = await fetch(presignedUrl, {
      method: "PUT",
      body: file,
      headers: {
        "Content-Type": file.type,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to upload file to storage");
    }
  },
};
