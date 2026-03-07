import { Response } from "express";
import { AgentService } from "./agent.service";
import { sendResponse, sendError, asyncHandler } from "@shared/utils/response";
import { AuthenticatedRequest } from "@shared/middleware/auth";

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

// ─── TEAM INFORMATION ────────────────────────────────────────────────────────────

export const getTeams = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const teams = await agentService.getAgentTeams(req.user.userId, req.user.activeOrganizationId);
  sendResponse(res, 200, true, "Teams retrieved successfully", teams);
});

export const getTeamMembers = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const id = getParam(req.params.id);
  const members = await agentService.getTeamMembers(req.user.userId, req.user.activeOrganizationId, id);
  if (!members) return sendError(res, 403, "Access denied - not a member of this team");
  sendResponse(res, 200, true, "Team members retrieved successfully", members);
});

export const getAllTeams = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const teams = await agentService.getAllTeams(req.user.activeOrganizationId);
  sendResponse(res, 200, true, "All teams retrieved successfully", teams);
});

export const getAllTeamMembers = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const id = getParam(req.params.id);
  const members = await agentService.getAllTeamMembers(req.user.activeOrganizationId, id);
  sendResponse(res, 200, true, "Team members retrieved successfully", members);
});

// ─── STATS ───────────────────────────────────────────────────────────────────────

export const getStats = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const stats = await agentService.getAgentStats(req.user.userId, req.user.activeOrganizationId);
  if (!stats) return sendError(res, 404, "Agent not found");
  sendResponse(res, 200, true, "Stats retrieved successfully", stats);
});
