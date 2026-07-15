import { Request, Response } from "express";
import { Types } from "mongoose";
import { asyncHandler, sendError, sendResponse } from "@shared/core/response";
import { AuthenticatedRequest } from "@shared/security/middleware/auth";
import KnowledgeService from "./knowledge.service";
import { AnalyticsService } from "../analytics/analytics.service";
import { tracker } from "@shared/utils/tracker";
import { Knowledge, UnansweredQuestion } from "@shared/models";

const getOrgId = (req: Request): string => (req as AuthenticatedRequest).user.activeOrganizationId;
const getUserId = (req: Request): string => (req as AuthenticatedRequest).user.userId;

// GET /api/v1/knowledge
export const getKnowledgeItems = asyncHandler(async (req: Request, res: Response) => {
  const orgId = getOrgId(req);
  const result = await KnowledgeService.getItems(orgId);
  sendResponse(res, 200, true, "Knowledge items fetched", result);
});

// POST /api/v1/knowledge/request-upload
export const requestFileUpload = asyncHandler(async (req: Request, res: Response) => {
  const orgId = getOrgId(req);
  const uploadedBy = getUserId(req);
  const result = await KnowledgeService.requestFileUpload(req.body, uploadedBy, orgId);
  sendResponse(res, 201, true, "Presigned upload URL generated", result);
});

// POST /api/v1/knowledge/:documentId/confirm
export const confirmUpload = asyncHandler(async (req: Request, res: Response) => {
  const documentId = req.params.documentId as string;
  const doc = await KnowledgeService.confirmUpload(documentId, getOrgId(req));
  sendResponse(
    res, doc ? 200 : 404, !!doc,
    doc ? "Upload confirmed and queued for ingestion" : "Knowledge document not found",
    doc ?? undefined,
  );
});

// GET /api/v1/knowledge/:documentId/view-url
export const getViewUrl = asyncHandler(async (req: Request, res: Response) => {
  const documentId = req.params.documentId as string;
  const result = await KnowledgeService.getViewUrl(documentId, getOrgId(req));

  if (result) {
    tracker.trackEvent(
      getOrgId(req),
      "knowledge_view",
      "system",
      { documentId },
      {
        userId: getUserId(req),
        channel: "web",
      },
    );
  }

  sendResponse(
    res, result ? 200 : 404, !!result,
    result ? "View URL generated" : "Document not found or has no file",
    result ?? undefined,
  );
});

// DELETE /api/v1/knowledge/:documentId
export const deleteKnowledge = asyncHandler(async (req: Request, res: Response) => {
  const documentId = req.params.documentId as string;
  const doc = await KnowledgeService.deleteItem(documentId, getOrgId(req));
  sendResponse(
    res, doc ? 200 : 404, !!doc,
    doc ? "Knowledge item deleted" : "Knowledge document not found",
    doc ? { id: documentId } : undefined,
  );
});

// POST /api/v1/knowledge/:documentId/reindex
export const reindexKnowledge = asyncHandler(async (req: Request, res: Response) => {
  const documentId = req.params.documentId as string;
  const doc = await KnowledgeService.reindexItem(documentId, getOrgId(req));
  sendResponse(
    res, doc ? 200 : 404, !!doc,
    doc ? "Knowledge item re-queued for ingestion" : "Knowledge document not found",
    doc ?? undefined,
  );
});

// PATCH /api/v1/knowledge/:documentId
export const updateKnowledge = asyncHandler(async (req: Request, res: Response) => {
  const documentId = req.params.documentId as string;
  const doc = await KnowledgeService.updateItem(documentId, getOrgId(req), req.body);
  sendResponse(
    res, doc ? 200 : 404, !!doc,
    doc ? "Knowledge item updated" : "Knowledge document not found",
    doc ?? undefined,
  );
});

// POST /api/v1/knowledge
export const createTextKnowledge = asyncHandler(async (req: Request, res: Response) => {
  const doc = await KnowledgeService.createTextEntry(req.body, getUserId(req), getOrgId(req));
  sendResponse(res, 201, true, "Knowledge entry created and queued for indexing", doc);
});

// ─── AI-Internal Endpoints (x-ai-tool-secret) ──────────────────────────────

// PATCH /api/v1/knowledge/ai/:documentId/status
// Called by apps/agent doc-status.service to update indexing status without a direct DB connection.
export const aiUpdateDocStatus = asyncHandler(async (req: Request, res: Response) => {
  const { documentId } = req.params;
  const { organizationId, status, wordCount, chunkCount, lastIndexed, errorMessage, failedChunkCount, totalChunkCount } = req.body;

  if (!organizationId || !status) {
    return sendError(res, 400, "organizationId and status are required");
  }

  const patch: Record<string, unknown> = { status };
  if (wordCount !== undefined) patch.wordCount = wordCount;
  if (chunkCount !== undefined) patch.chunkCount = chunkCount;
  if (lastIndexed !== undefined) patch.lastIndexed = new Date(lastIndexed);
  if (errorMessage !== undefined) patch.errorMessage = errorMessage;
  if (failedChunkCount !== undefined) patch.failedChunkCount = failedChunkCount;
  if (totalChunkCount !== undefined) patch.totalChunkCount = totalChunkCount;

  const doc = await Knowledge.findOneAndUpdate(
    { _id: documentId, organizationId },
    { $set: patch },
    { new: true },
  );

  if (!doc) return sendError(res, 404, "Knowledge document not found");
  sendResponse(res, 200, true, "Document status updated", { id: documentId, status: doc.status });
});

// GET /api/v1/knowledge/ai/:documentId/sync-info
// Called by apps/agent ingestion worker to retrieve URL re-crawl scheduling fields.
export const aiGetSyncInfo = asyncHandler(async (req: Request, res: Response) => {
  const { documentId } = req.params;
  const { organizationId } = req.query as Record<string, string>;

  if (!organizationId) return sendError(res, 400, "organizationId is required");

  const doc = await Knowledge.findOne(
    { _id: documentId, organizationId },
    { isPaused: 1, syncFrequency: 1, sourceUrl: 1, fetchMode: 1, crawlDepth: 1, title: 1 },
  ).lean();

  if (!doc) return sendError(res, 404, "Knowledge document not found");

  sendResponse(res, 200, true, "Sync info fetched", {
    isPaused: doc.isPaused ?? false,
    syncFrequency: doc.syncFrequency ?? null,
    sourceUrl: doc.sourceUrl ?? null,
    fetchMode: doc.fetchMode ?? null,
    crawlDepth: doc.crawlDepth ?? null,
    title: doc.title,
  });
});

// POST /api/v1/knowledge/ai/unanswered-questions
// Called by apps/agent when retrieval cannot answer a visitor question.
export const aiSaveUnansweredQuestion = asyncHandler(async (req: Request, res: Response) => {
  const { organizationId, conversationId, contactId, question, source } = req.body;

  if (!organizationId || !conversationId || !question) {
    return sendError(res, 400, "organizationId, conversationId, and question are required");
  }

  if (!Types.ObjectId.isValid(organizationId) || !Types.ObjectId.isValid(conversationId)) {
    return sendError(res, 400, "Invalid organizationId or conversationId");
  }

  if (contactId && !Types.ObjectId.isValid(contactId)) {
    return sendError(res, 400, "Invalid contactId");
  }

  if (source && source !== "knowledge_gap") {
    return sendError(res, 400, "Invalid source");
  }

  const trimmedQuestion = String(question).trim();
  if (!trimmedQuestion) {
    return sendError(res, 400, "question is required");
  }

  const normalizedQuestion = trimmedQuestion.toLowerCase().replace(/\s+/g, " ");
  const recentWindow = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const existing = await UnansweredQuestion.findOne({
    organizationId,
    conversationId,
    normalizedQuestion,
    createdAt: { $gte: recentWindow },
  }).lean();

  if (!existing) {
    await UnansweredQuestion.create({
      organizationId: new Types.ObjectId(organizationId),
      conversationId: new Types.ObjectId(conversationId),
      ...(contactId ? { contactId: new Types.ObjectId(contactId) } : {}),
      question: trimmedQuestion,
      normalizedQuestion,
      source: "knowledge_gap",
    });

    await AnalyticsService.invalidateCache(organizationId);
  }

  sendResponse(res, 201, true, "Unanswered question saved", {
    saved: !existing,
  });
});
