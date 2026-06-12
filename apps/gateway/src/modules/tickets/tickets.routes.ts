import { Router } from "express";
import {
  authenticate,
  resolveOrganization,
  requireRole,
  validateRequest,
  validateAiSecret,
} from "@shared/security/middleware";
import * as TicketsController from "./tickets.controller";
import { ticketsSchema } from "./tickets.schema";

const router = Router();

// ─── AI-Internal Routes (x-ai-tool-secret, NO JWT) ──────────────────────────
// These are called by apps/agent tools only — not exposed to frontend.

router.post(
  "/ai",
  validateAiSecret,
  validateRequest(ticketsSchema.aiCreateTicket),
  TicketsController.aiCreateTicket,
);

router.patch(
  "/ai/:ticketId",
  validateAiSecret,
  validateRequest(ticketsSchema.aiUpdateTicket),
  TicketsController.aiUpdateTicket,
);

router.patch(
  "/ai/:ticketId/close",
  validateAiSecret,
  validateRequest(ticketsSchema.aiCloseTicket),
  TicketsController.aiCloseTicket,
);

// ─── Agent UI Routes (JWT required) ─────────────────────────────────────────

router.use(authenticate, resolveOrganization);

router.get(
  "/",
  requireRole("agent"),
  validateRequest(ticketsSchema.listTickets, "query"),
  TicketsController.listTickets,
);

router.get(
  "/:ticketId",
  requireRole("agent"),
  TicketsController.getTicketById,
);

router.post(
  "/",
  requireRole("agent"),
  validateRequest(ticketsSchema.createTicket),
  TicketsController.createTicketAgent,
);

router.patch(
  "/:ticketId",
  requireRole("agent"),
  validateRequest(ticketsSchema.updateTicket),
  TicketsController.updateTicketAgent,
);

router.post(
  "/:ticketId/notes",
  requireRole("agent"),
  validateRequest(ticketsSchema.addNote),
  TicketsController.addNoteAgent,
);

export default router;
