import { Request, Response } from "express";
import { asyncHandler, sendError, sendResponse } from "@shared/core/response";
import { AuthenticatedRequest } from "@shared/security/middleware";
import { TicketsService } from "./tickets.service";

const service = new TicketsService();

const getOrgId = (req: Request): string =>
  (req as AuthenticatedRequest).user.activeOrganizationId;

const param = (req: Request, key: string): string => String(req.params[key] || "");

// ─── Agent UI Endpoints ──────────────────────────────────────────────────────

export const listTickets = asyncHandler(async (req: Request, res: Response) => {
  const q = req.query as Record<string, string>;
  const result = await service.listTickets(getOrgId(req), {
    status: q.status || undefined,
    priority: q.priority || undefined,
    assignedTo: q.assignedTo || undefined,
    limit: q.limit ? Number(q.limit) : 50,
    page: q.page ? Number(q.page) : 1,
  });
  sendResponse(res, 200, true, "Tickets fetched", result);
});

export const getTicketById = asyncHandler(async (req: Request, res: Response) => {
  const ticket = await service.getTicketById(getOrgId(req), param(req, "ticketId"));
  if (!ticket) return sendError(res, 404, "Ticket not found");
  sendResponse(res, 200, true, "Ticket fetched", { ticket });
});

export const createTicketAgent = asyncHandler(async (req: Request, res: Response) => {
  const { conversationId, contactId, title, description, priority, tags } = req.body;
  const ticket = await service.createTicket({
    organizationId: getOrgId(req),
    conversationId,
    contactId,
    title,
    description,
    priority,
    source: "agent",
    tags,
  });
  sendResponse(res, 201, true, "Ticket created", { ticket });
});

export const updateTicketAgent = asyncHandler(async (req: Request, res: Response) => {
  const ticket = await service.updateTicket(getOrgId(req), param(req, "ticketId"), req.body);
  if (!ticket) return sendError(res, 404, "Ticket not found");
  sendResponse(res, 200, true, "Ticket updated", { ticket });
});

export const addNoteAgent = asyncHandler(async (req: Request, res: Response) => {
  const { content } = req.body;
  const authReq = req as AuthenticatedRequest;
  const ticket = await service.addNote(
    getOrgId(req),
    param(req, "ticketId"),
    content,
    authReq.user.email || "Agent",
  );
  if (!ticket) return sendError(res, 404, "Ticket not found");
  sendResponse(res, 200, true, "Note added", { ticket });
});

// ─── AI-Internal Endpoints (x-ai-tool-secret) ───────────────────────────────

export const aiCreateTicket = asyncHandler(async (req: Request, res: Response) => {
  const {
    organizationId,
    conversationId,
    contactId,
    title,
    description,
    priority,
    status,
    requesterName,
    requesterEmail,
    tags,
    idempotencyKey,
  } = req.body;
  const ticket = await service.createTicket({
    organizationId,
    conversationId,
    contactId,
    title,
    description,
    priority,
    status,
    requesterName,
    requesterEmail,
    source: "ai",
    tags,
    idempotencyKey,
  });
  sendResponse(res, 201, true, "Ticket created by AI", { ticket });
});

export const aiUpdateTicket = asyncHandler(async (req: Request, res: Response) => {
  const { organizationId, ...rest } = req.body;
  const ticket = await service.updateTicket(organizationId, param(req, "ticketId"), rest);
  if (!ticket) return sendError(res, 404, "Ticket not found");
  sendResponse(res, 200, true, "Ticket updated by AI", { ticket });
});

export const aiCloseTicket = asyncHandler(async (req: Request, res: Response) => {
  const { organizationId, resolutionNote } = req.body;
  const ticket = await service.closeTicket(organizationId, param(req, "ticketId"), { resolutionNote });
  if (!ticket) return sendError(res, 404, "Ticket not found");
  sendResponse(res, 200, true, "Ticket closed by AI", { ticket });
});
