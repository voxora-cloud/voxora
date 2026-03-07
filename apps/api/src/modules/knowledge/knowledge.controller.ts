import { Request, Response } from "express";
import { asyncHandler, sendResponse } from "@shared/utils/response";
import { AuthenticatedRequest } from "@shared/middleware/auth";
import KnowledgeService from "./knowledge.service";

const getOrgId = (req: Request): string => (req as AuthenticatedRequest).user.activeOrganizationId;
const getUserId = (req: Request): string => (req as AuthenticatedRequest).user.userId;

// GET /api/v1/knowledge
export const getKnowledgeItems = asyncHandler(async (req: Request, res: Response) => {
  const orgId = getOrgId(req);
  const teamId = req.query.teamId as string | undefined;
  const result = await KnowledgeService.getItems(orgId, teamId);
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
