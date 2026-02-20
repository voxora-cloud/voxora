import { Request, Response } from "express";
import { asyncHandler, sendResponse } from "@shared/utils/response";
import KnowledgeService from "./knowledge.service";

// GET /api/v1/knowledge
export const getKnowledgeItems = asyncHandler(
  async (req: Request, res: Response) => {
    const teamId = (req as any).user?.teamId as string | undefined;
    const result = await KnowledgeService.getItems(teamId);
    sendResponse(res, 200, true, "Knowledge items fetched", result);
  },
);

/**
 * POST /api/v1/knowledge/request-upload
 * For PDF/DOCX: generates a presigned PUT URL via StorageService + creates DB record.
 * Client uploads directly to MinIO, then calls /:documentId/confirm.
 */
export const requestFileUpload = asyncHandler(
  async (req: Request, res: Response) => {
    const uploadedBy = (req as any).user?.userId || "admin";
    const result = await KnowledgeService.requestFileUpload(req.body, uploadedBy);
    sendResponse(res, 201, true, "Presigned upload URL generated", result);
  },
);

/**
 * POST /api/v1/knowledge/:documentId/confirm
 * Called after the client successfully PUT the file to MinIO.
 * Marks the record as queued and enqueues the BullMQ ingestion job.
 */
export const confirmUpload = asyncHandler(
  async (req: Request, res: Response) => {
    const { documentId } = req.params;
    const doc = await KnowledgeService.confirmUpload(documentId);
    sendResponse(
      res,
      doc ? 200 : 404,
      !!doc,
      doc ? "Upload confirmed and queued for ingestion" : "Knowledge document not found",
      doc ?? undefined,
    );
  },
);

/**
 * GET /api/v1/knowledge/:documentId/view-url
 * Returns a short-lived presigned GET URL so the admin can preview the file.
 */
export const getViewUrl = asyncHandler(
  async (req: Request, res: Response) => {
    const { documentId } = req.params;
    const result = await KnowledgeService.getViewUrl(documentId);
    sendResponse(
      res,
      result ? 200 : 404,
      !!result,
      result ? "View URL generated" : "Document not found or has no file",
      result ?? undefined,
    );
  },
);

/**
 * DELETE /api/v1/knowledge/:documentId
 * Deletes the MongoDB record and the associated MinIO file.
 */
export const deleteKnowledge = asyncHandler(
  async (req: Request, res: Response) => {
    const { documentId } = req.params;
    const doc = await KnowledgeService.deleteItem(documentId);
    sendResponse(
      res,
      doc ? 200 : 404,
      !!doc,
      doc ? "Knowledge item deleted" : "Knowledge document not found",
      doc ? { id: documentId } : undefined,
    );
  },
);
/**
 * POST /api/v1/knowledge
 * For text/URL entries — single-step create + queue.
 */
export const createTextKnowledge = asyncHandler(
  async (req: Request, res: Response) => {
    const createdBy = (req as any).user?.userId || "admin";
    const doc = await KnowledgeService.createTextEntry(req.body, createdBy);
    sendResponse(res, 201, true, "Knowledge entry created and queued for indexing", doc);
  },
);
