import { Request, Response } from "express";
import { AdminService } from "./admin.service";
import { MembershipService } from "@modules/membership/membership.service";
import { sendResponse, sendError, asyncHandler } from "@shared/utils/response";
import { AuthenticatedRequest } from "@shared/middleware/auth";
import { MembershipRole } from "@shared/models";

const adminService = new AdminService();

// ─── Helpers ────────────────────────────────────────────────────────────────────

const getParam = (param: string | string[] | undefined): string =>
  Array.isArray(param) ? param[0] : param || "";

const getOrgId = (req: Request): string =>
  (req as AuthenticatedRequest).user.activeOrganizationId;

// ─── TEAM MANAGEMENT ────────────────────────────────────────────────────────────

export const getTeams = asyncHandler(async (req: Request, res: Response) => {
  const { page = 1, limit = 10, search } = req.query;
  const result = await adminService.getTeams(getOrgId(req), {
    page: Number(page),
    limit: Number(limit),
    search: search as string,
  });
  sendResponse(res, 200, true, "Teams retrieved successfully", result);
});

export const getTeamById = asyncHandler(async (req: Request, res: Response) => {
  const id = getParam(req.params.id);
  const team = await adminService.getTeamById(getOrgId(req), id);
  if (!team) return sendError(res, 404, "Team not found");
  sendResponse(res, 200, true, "Team retrieved successfully", team);
});

export const createTeam = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const team = await adminService.createTeam(req.user.activeOrganizationId, {
    ...req.body,
    createdBy: req.user.userId,
  });
  sendResponse(res, 201, true, "Team created successfully", team);
});

export const updateTeam = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const id = getParam(req.params.id);
  const team = await adminService.updateTeam(req.user.activeOrganizationId, id, req.body);
  if (!team) return sendError(res, 404, "Team not found");
  sendResponse(res, 200, true, "Team updated successfully", team);
});

export const deleteTeam = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const id = getParam(req.params.id);
  const result = await adminService.deleteTeam(req.user.activeOrganizationId, id);
  if (!result.success) return sendError(res, (result as any).statusCode || 400, (result as any).message || "Delete failed");
  sendResponse(res, 200, true, "Team deleted successfully");
});

// ─── AGENT MANAGEMENT ───────────────────────────────────────────────────────────

export const getAgents = asyncHandler(async (req: Request, res: Response) => {
  const { page = 1, limit = 10, status, search } = req.query;
  const result = await adminService.getAgents(getOrgId(req), {
    page: Number(page),
    limit: Number(limit),
    status: status as string,
    search: search as string,
  });
  sendResponse(res, 200, true, "Agents retrieved successfully", result);
});

export const getAgentById = asyncHandler(async (req: Request, res: Response) => {
  const id = getParam(req.params.id);
  const agent = await adminService.getAgentById(getOrgId(req), id);
  if (!agent) return sendError(res, 404, "Agent not found");
  sendResponse(res, 200, true, "Agent retrieved successfully", agent);
});

export const inviteAgent = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { email, name, role, teamIds, password } = req.body;
  const result = await MembershipService.inviteMember(
    req.user.userId,
    req.user.activeOrganizationId,
    { email, name, role: role as MembershipRole, teamIds, password },
  );
  sendResponse(res, 201, true, "Agent invited successfully", { membershipId: result.membership._id });
});

export const updateAgent = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const id = getParam(req.params.id);
  const result = await adminService.updateAgent(req.user.activeOrganizationId, id, req.body);
  if (!result.success) return sendError(res, (result as any).statusCode || 400, (result as any).message || "Update failed");
  sendResponse(res, 200, true, "Agent updated successfully", result.data);
});

export const deleteAgent = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const id = getParam(req.params.id);
  const result = await adminService.deleteAgent(req.user.activeOrganizationId, id);
  if (!result.success) return sendError(res, (result as any).statusCode || 400, (result as any).message || "Delete failed");
  sendResponse(res, 200, true, "Agent removed from organization");
});

export const resendInvite = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  sendError(res, 410, "Use POST /memberships/organizations/:orgId/members/invite instead");
});

// ─── WIDGET ──────────────────────────────────────────────────────────────────────

export const createWidget = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const body = { ...req.body };
  if (body.logoUrl) body.logoUrl = normalizeLogoUrl(body.logoUrl);
  if (body.appearance?.logoUrl) body.appearance.logoUrl = normalizeLogoUrl(body.appearance.logoUrl);
  const widget = await adminService.createWidget(req.user.activeOrganizationId, body);
  sendResponse(res, 201, true, "Widget created successfully", widget);
});

export const getWidget = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const result = await adminService.getWidget(req.user.activeOrganizationId);
  if (!result) return sendError(res, 404, "Widget not found");
  const widgetData: any = result.toObject ? result.toObject() : { ...result };

  if (widgetData.logoUrl) {
    const fileKey = normalizeLogoUrl(widgetData.logoUrl)!;
    widgetData.logoUrl = toStorageProxyUrl(req, fileKey);
  }

  if (widgetData.appearance?.logoUrl) {
    const fileKey = normalizeLogoUrl(widgetData.appearance.logoUrl)!;
    widgetData.appearance.logoUrl = toStorageProxyUrl(req, fileKey);
  }

  sendResponse(res, 200, true, "Widget retrieved successfully", widgetData);
});

export const updateWidget = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const body = { ...req.body };
  if (body.logoUrl) body.logoUrl = normalizeLogoUrl(body.logoUrl);
  if (body.appearance?.logoUrl) body.appearance.logoUrl = normalizeLogoUrl(body.appearance.logoUrl);
  const widget = await adminService.updateWidget(req.user.activeOrganizationId, body);
  sendResponse(res, 200, true, "Widget updated successfully", widget);
});

// ─── DASHBOARD STATS ─────────────────────────────────────────────────────────────

export const getDashboardStats = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const stats = await adminService.getDashboardStats(req.user.activeOrganizationId);
  sendResponse(res, 200, true, "Dashboard stats retrieved successfully", stats);
});

// ─── Helpers ─────────────────────────────────────────────────────────────────────

function normalizeLogoUrl(logoUrl: string | undefined): string | undefined {
  if (!logoUrl) return logoUrl;
  if (!/^https?:\/\//i.test(logoUrl)) return logoUrl;
  try {
    const url = new URL(logoUrl);
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length > 1) return parts.slice(1).join("/");
  } catch { }
  return logoUrl;
}

function toStorageProxyUrl(req: Request, fileKey: string): string {
  const scheme = req.get("x-forwarded-proto") || req.protocol || "http";
  const host = req.get("host") || "localhost:3002";
  return `${scheme}://${host}/api/v1/storage/file?key=${encodeURIComponent(fileKey)}`;
}
