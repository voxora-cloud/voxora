import { Request, Response } from "express";
import { asyncHandler, sendError, sendResponse } from "@shared/utils/response";
import { ConversationService } from "./conversation.service";
import { AuthenticatedRequest } from "@shared/middleware/auth";
import { getSocketManager } from "@sockets/index";
import logger from "@shared/utils/logger";

const conversationService = new ConversationService();

const getOrgId = (req: Request): string => (req as AuthenticatedRequest).user.activeOrganizationId;

// ─── GET all conversations ──────────────────────────────────────────────────────

export const getConversations = asyncHandler(async (req: Request, res: Response) => {
  const { status, limit = 50, offset = 0 } = req.query;
  const { userId, orgRole } = (req as AuthenticatedRequest).user;

  const result = await conversationService.getConversations(getOrgId(req), {
    status: status as string,
    limit: Number(limit),
    offset: Number(offset),
    assignedTo: orgRole === "agent" ? userId : undefined,
  });

  sendResponse(res, 200, true, "Conversations fetched successfully", result);
});

// ─── GET single conversation ────────────────────────────────────────────────────

export const getConversationById = asyncHandler(async (req: Request, res: Response) => {
  const conversationId = req.params.conversationId as string;
  const result = await conversationService.getConversationById(getOrgId(req), conversationId);
  if (!result) return sendError(res, 404, "Conversation not found");
  sendResponse(res, 200, true, "Conversation fetched successfully", result);
});

// ─── PATCH status (simple) ──────────────────────────────────────────────────────

export const patchStatus = asyncHandler(async (req: Request, res: Response) => {
  const conversationId = req.params.conversationId as string;
  const { status } = req.body;

  const conversation = await conversationService.patchConversationStatus(
    getOrgId(req),
    conversationId,
    status,
  );
  if (!conversation) return sendError(res, 404, "Conversation not found");

  const sm = getSocketManager();
  if (sm?.ioInstance) {
    sm.ioInstance.to(`org:${getOrgId(req)}:conv:${conversationId}`).emit("status_updated", {
      conversationId, status, updatedBy: (req as any).user?.name || "Agent", timestamp: new Date(),
    });
  }

  sendResponse(res, 200, true, "Conversation status updated", { conversation });
});

// ─── Visitor info update ────────────────────────────────────────────────────────

export const updateVisitorInfo = asyncHandler(async (req: Request, res: Response) => {
  const conversationId = req.params.conversationId as string;
  const { name, email, sessionId } = req.body;

  if (!name && !email) return sendError(res, 400, "At least name or email is required");

  // Visitor info update doesn't require org auth (widget), but widgetId => orgId lookup
  // For now accept without org scope since the widget public key resolves org server-side
  const result = await conversationService.updateVisitorInfo(
    (req as any).user?.activeOrganizationId || "",
    conversationId,
    { name, email, sessionId },
  );

  if (!result.found) return sendError(res, 404, "Conversation not found");
  if (!result.validSession) return sendError(res, 403, "Invalid session ID");

  const sm = getSocketManager();
  if (sm?.ioInstance) {
    sm.ioInstance.emit("visitor_info_updated", { conversationId, visitorName: name, visitorEmail: email, timestamp: new Date() });
  }

  sendResponse(res, 200, true, "Visitor information updated successfully", { name, email, isAnonymous: !(name && email) });
});

// ─── Route conversation ─────────────────────────────────────────────────────────

export const routeConversation = asyncHandler(async (req: Request, res: Response) => {
  const conversationId = req.params.conversationId as string;
  const { teamId, agentId, reason } = req.body;
  const orgId = getOrgId(req);

  if (!teamId && !agentId) return sendError(res, 400, "Either teamId or agentId must be provided");

  const result = await conversationService.routeConversation(
    orgId,
    conversationId,
    { teamId, agentId, reason },
    (req as AuthenticatedRequest).user.userId,
  );

  if (!result.found) return sendError(res, 404, "Conversation not found");
  if (result.noAgent) return sendError(res, 404, `No available agents found in team ${result.teamId}`);
  if (result.agentNotFound) return sendError(res, 404, "Agent not found");

  const sm = getSocketManager();
  if (sm && result.selectedAgentId) {
    try {
      const payload = {
        conversationId: result.originalConversation!._id,
        subject: result.originalConversation!.subject,
        routedTo: result.selectedAgentId,
        teamName: result.teamName,
        agentName: result.agentName,
        reason: reason || "Manual routing",
        timestamp: new Date(),
      };
      sm.emitToUser?.(result.selectedAgentId.toString(), "new_widget_conversation", payload);
      sm.emitToConversation(conversationId, "conversation_escalated", {
        conversationId,
        reason: reason || "Transferred to another agent",
        agent: { id: result.selectedAgentId.toString(), name: result.agentName, email: result.agentEmail },
      });
      const oldAgentId = result.originalConversation!.assignedTo;
      if (oldAgentId && oldAgentId.toString() !== result.selectedAgentId.toString()) {
        sm.emitToUser?.(oldAgentId.toString(), "conversation_removed", { conversationId });
      }
    } catch (err: any) {
      logger.error(`Failed to emit routing notification: ${err?.message}`);
    }
  }

  sendResponse(res, 200, true, "Conversation routed successfully", {
    conversationId: result.updatedConversation?._id,
    assignedTo: result.updatedConversation?.assignedTo,
    teamId: result.selectedTeamId,
    teamName: result.teamName,
    agentName: result.agentName,
  });
});

// ─── Update conversation status (full) ──────────────────────────────────────────

export const updateConversationStatus = asyncHandler(async (req: Request, res: Response) => {
  const conversationId = req.params.conversationId as string;
  const { status } = req.body;
  const orgId = getOrgId(req);

  const result = await conversationService.updateConversationStatus(
    orgId,
    conversationId,
    status,
    (req as AuthenticatedRequest).user.userId,
  );

  if (!result.valid) return sendError(res, 400, "Status must be one of: open, pending, closed, resolved");
  if (!result.found) return sendError(res, 404, "Conversation not found");

  const sm = getSocketManager();
  if (sm?.ioInstance) {
    sm.ioInstance
      .to(`org:${orgId}:conv:${conversationId}`)
      .emit("status_updated", {
        conversationId: result.conversation!._id,
        status,
        updatedBy: (req as any).user?.name || "Agent",
        timestamp: new Date(),
      });
  }

  sendResponse(res, 200, true, "Status updated successfully", {
    conversationId: result.conversation!._id,
    status: result.conversation!.status,
  });
});
