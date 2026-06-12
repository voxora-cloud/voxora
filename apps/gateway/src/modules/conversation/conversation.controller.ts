import { Request, Response } from "express";
import { asyncHandler, sendError, sendResponse } from "@shared/core/response";
import { ConversationService } from "./conversation.service";
import { AuthenticatedRequest } from "@shared/security/middleware/auth";
import { getSocketManager } from "@sockets/index";
import logger from "@shared/core/logger";
import { tracker } from "@shared/utils/tracker";
import { Conversation, Message } from "@shared/models";

const conversationService = new ConversationService();

const getOrgId = (req: Request): string => (req as AuthenticatedRequest).user.activeOrganizationId;

// ─── GET all conversations ──────────────────────────────────────────────────────

export const getConversations = asyncHandler(async (req: Request, res: Response) => {
  const { status, limit = 50, offset = 0, assignedToMe, unassigned } = req.query;
  const { userId, orgRole } = (req as AuthenticatedRequest).user;

  let assignedTo: string | null | undefined = userId;

  if (unassigned === "true") {
    assignedTo = null; // Explicitly null for unassigned
  } else if (assignedToMe === "true") {
    assignedTo = userId;
  } else if (orgRole === "admin" || orgRole === "owner") {
    assignedTo = undefined; // Undefined for "All" view
  }

  const result = await conversationService.getConversations(getOrgId(req), {
    status: status as string,
    limit: Number(limit),
    offset: Number(offset),
    assignedTo,
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
  const { agentId, reason } = req.body;
  const orgId = getOrgId(req);

  if (!agentId) return sendError(res, 400, "agentId must be provided");

  const result = await conversationService.routeConversation(
    orgId,
    conversationId,
    { agentId, reason },
    (req as AuthenticatedRequest).user.userId,
  );

  if (!result.found) return sendError(res, 404, "Conversation not found");
  if (result.noAgent) return sendError(res, 404, "No available agents");
  if (result.agentNotFound) return sendError(res, 404, "Agent not found");

  const sm = getSocketManager();
  if (sm && result.selectedAgentId) {
    try {
      const payload = {
        conversationId: result.originalConversation!._id,
        subject: result.originalConversation!.subject,
        routedTo: result.selectedAgentId,
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
    agentName: result.agentName,
  });

  if (result.updatedConversation?._id && result.selectedAgentId) {
    tracker.trackEvent(
      orgId,
      "agent_assigned",
      "system",
      { reason: reason || "manual_routing" },
      {
        conversationId: result.updatedConversation._id.toString(),
        agentId: result.selectedAgentId.toString(),
        channel: "web",
      },
    );
  }
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

  if (status === "closed" || status === "resolved") {
    tracker.trackEvent(
      orgId,
      status === "closed" ? "conversation_closed" : "conversation_resolved",
      "agent",
      { updatedBy: (req as AuthenticatedRequest).user.userId },
      {
        conversationId: result.conversation!._id.toString(),
        agentId: (req as AuthenticatedRequest).user.userId,
        channel: "web",
      },
    );
  }
});

// ─── AI-Internal: Conversation Gate (status/escalation check) ───────────────

export const aiGetConversationGate = asyncHandler(async (req: Request, res: Response) => {
  const conversationId = req.params.conversationId as string;
  const { organizationId } = req.query as Record<string, string>;

  if (!organizationId) return sendError(res, 400, "organizationId is required");

  const conv = await conversationService.getConversationGate(organizationId, conversationId);
  if (!conv) return sendError(res, 404, "Conversation not found");

  sendResponse(res, 200, true, "Conversation gate fetched", { gate: conv });
});

// ─── AI-Internal: Mark Query Resolved ────────────────────────────────────────

export const aiResolveConversation = asyncHandler(async (req: Request, res: Response) => {
  const conversationId = req.params.conversationId as string;
  const { organizationId, resolutionEntry } = req.body;

  if (!organizationId) return sendError(res, 400, "organizationId is required");
  if (!resolutionEntry) return sendError(res, 400, "resolutionEntry is required");

  const result = await conversationService.markQueryResolved(
    organizationId,
    conversationId,
    resolutionEntry,
  );

  if (!result) return sendError(res, 404, "Conversation not found");

  sendResponse(res, 200, true, "Query marked as resolved", { resolutionId: resolutionEntry.id });
});

// ─── AI-Internal: Conversation Memory ────────────────────────────────────────

export const aiGetMemory = asyncHandler(async (req: Request, res: Response) => {
  const conversationId = req.params.conversationId as string;
  const { organizationId, limit } = req.query as Record<string, string>;

  if (!organizationId) return sendError(res, 400, "organizationId is required");

  const messages = await Message.find({ conversationId, organizationId })
    .sort({ createdAt: -1 })
    .limit(Number(limit) || 10)
    .lean();
  const conversation = await Conversation.findOne({ _id: conversationId, organizationId })
    .select("visitor.name visitor.email")
    .lean();

  const memory = messages.reverse().map((m) => ({
    role: m.metadata?.source === "widget" ? "user" : "assistant",
    content: m.content,
    senderName: m.metadata?.senderName || null,
    timestamp: m.createdAt,
  }));

  sendResponse(res, 200, true, "Conversation memory fetched", {
    memory,
    visitor: {
      name:
        conversation?.visitor?.name && conversation.visitor.name !== "Anonymous User"
          ? conversation.visitor.name
          : null,
      email:
        conversation?.visitor?.email && conversation.visitor.email !== "anonymous@temp.local"
          ? conversation.visitor.email
          : null,
    },
  });
});

// ─── AI-Internal: Escalate to Human ──────────────────────────────────────────

export const aiEscalate = asyncHandler(async (req: Request, res: Response) => {
  const conversationId = req.params.conversationId as string;
  const { organizationId, reason, agentId } = req.body;

  if (!organizationId) return sendError(res, 400, "organizationId is required");

  // If no specific agentId provided, auto-assign using existing logic (agent > admin > owner)
  let resolvedAgentId = agentId;
  if (!resolvedAgentId) {
    const autoAssign = await conversationService.autoAssignConversation(organizationId);
    resolvedAgentId = autoAssign.agentId || undefined;
  }

  const result = await conversationService.routeConversation(
    organizationId,
    conversationId,
    { agentId: resolvedAgentId, reason },
    "ai_tool",
  );

  if (!result.found) return sendError(res, 404, "Conversation not found");

  // Set status to pending
  await conversationService.patchConversationStatus(organizationId, conversationId, "pending");

  // Fire real-time events so the dashboard reacts immediately
  const sm = getSocketManager();
  if (sm && result.selectedAgentId) {
    try {
      sm.emitToUser?.(result.selectedAgentId.toString(), "new_widget_conversation", {
        conversationId,
        subject: result.originalConversation?.subject,
        routedTo: result.selectedAgentId,
        agentName: result.agentName,
        reason: reason || "AI escalation",
        timestamp: new Date(),
      });
      sm.emitToConversation(conversationId, "conversation_escalated", {
        conversationId,
        reason: reason || "AI escalated this conversation to a human agent",
        agent: {
          id: result.selectedAgentId.toString(),
          name: result.agentName,
          email: result.agentEmail,
        },
      });
    } catch (err: any) {
      logger.error(`[AI Escalate] Socket emit failed: ${err?.message}`);
    }
  } else if (sm) {
    // No agent online — notify org room so any agent can pick it up
    sm.ioInstance?.to(`org:${organizationId}`).emit("conversation_pending", {
      conversationId,
      reason: reason || "AI escalated — awaiting agent",
    });
  }

  sendResponse(res, 200, true, "Escalated to human agent", {
    conversationId,
    assignedAgent: result.selectedAgentId?.toString() || null,
    agentName: result.agentName || null,
    status: "pending",
  });
});
