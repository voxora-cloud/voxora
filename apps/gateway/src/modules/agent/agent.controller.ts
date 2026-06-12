import { Response } from "express";
import { AgentService } from "./agent.service";
import { sendResponse, sendError, asyncHandler } from "@shared/core/response";
import { AuthenticatedRequest } from "@shared/security/middleware/auth";

const agentService = new AgentService();

const getParam = (p: string | string[] | undefined): string =>
  Array.isArray(p) ? p[0] : p || "";

// ─── PROFILE ────────────────────────────────────────────────────────────────────

export const getProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const agent = await agentService.getAgentProfile(req.user.userId, req.user.activeOrganizationId);
  if (!agent) return sendError(res, 404, "Agent not found");
  sendResponse(res, 200, true, "Profile retrieved successfully", agent);
});

export const updateProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const agent = await agentService.updateAgentProfile(req.user.userId, req.body);
  if (!agent) return sendError(res, 404, "Agent not found");
  sendResponse(res, 200, true, "Profile updated successfully", agent);
});

export const updateStatus = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { status } = req.body;
  const result = await agentService.updateAgentStatus(req.user.userId, status);
  if (!result) return sendError(res, 404, "Agent not found");
  sendResponse(res, 200, true, "Status updated successfully", result);
});


// ─── STATS ───────────────────────────────────────────────────────────────────────

export const getStats = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const stats = await agentService.getAgentStats(req.user.userId, req.user.activeOrganizationId);
  if (!stats) return sendError(res, 404, "Agent not found");
  sendResponse(res, 200, true, "Stats retrieved successfully", stats);
});
