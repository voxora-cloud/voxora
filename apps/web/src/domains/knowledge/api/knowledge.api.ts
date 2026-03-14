import { apiClient } from "@/shared/lib/api-client";
import type {
  KnowledgeCreatePayload,
  KnowledgeUpdatePayload,
  KnowledgeUploadRequest,
  KnowledgeUploadResponse,
  KnowledgeItemResponse,
  KnowledgeListResponse,
  KnowledgeViewUrlResponse,
  DeleteResponse,
} from "../types";

export const knowledgeApi = {
  getKnowledgeItems: () => apiClient.get<KnowledgeListResponse>("/knowledge"),

  requestKnowledgeUpload: (payload: KnowledgeUploadRequest) =>
    apiClient.post<KnowledgeUploadResponse>("/knowledge/request-upload", payload),

  confirmKnowledgeUpload: (documentId: string) =>
    apiClient.post<KnowledgeItemResponse>(`/knowledge/${documentId}/confirm`),

  createTextKnowledge: (payload: KnowledgeCreatePayload) =>
    apiClient.post<KnowledgeItemResponse>("/knowledge", payload),

  getKnowledgeViewUrl: (documentId: string) =>
    apiClient.get<KnowledgeViewUrlResponse>(`/knowledge/${documentId}/view-url`),

  deleteKnowledgeItem: (documentId: string) =>
    apiClient.delete<DeleteResponse>(`/knowledge/${documentId}`),

  reindexKnowledgeItem: (documentId: string) =>
    apiClient.post<KnowledgeItemResponse>(`/knowledge/${documentId}/reindex`),

  updateKnowledgeItem: (documentId: string, payload: KnowledgeUpdatePayload) =>
    apiClient.patch<KnowledgeItemResponse>(`/knowledge/${documentId}`, payload),
};
