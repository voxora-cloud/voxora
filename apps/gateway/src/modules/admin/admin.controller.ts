import { Request, Response } from "express";
import { AdminService } from "./admin.service";
import { MembershipService } from "@modules/membership/membership.service";
import { sendResponse, sendError, asyncHandler } from "@shared/core/response";
import { AuthenticatedRequest } from "@shared/security/middleware/auth";
import { MembershipRole } from "@shared/models";

const adminService = new AdminService();

// ─── Helpers ────────────────────────────────────────────────────────────────────

const getParam = (param: string | string[] | undefined): string =>
  Array.isArray(param) ? param[0] : param || "";

const getOrgId = (req: Request): string =>
  (req as AuthenticatedRequest).user.activeOrganizationId;

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
  const { email, name, role, password } = req.body;
  const result = await MembershipService.inviteMember(
    req.user.userId,
    req.user.activeOrganizationId,
    { email, name, role: role as MembershipRole, password },
  );
  sendResponse(res, 201, true, "Agent invited successfully", { membershipId: result.membership._id });
});

export const updateAgent = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const id = getParam(req.params.id);
  const result = await adminService.updateAgent(req.user.activeOrganizationId, id, req.body, req.user.userId);
  if (!result.success) return sendError(res, (result as any).statusCode || 400, (result as any).message || "Update failed");
  sendResponse(res, 200, true, "Agent updated successfully", result.data);
});

export const deleteAgent = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const id = getParam(req.params.id);
  const result = await adminService.deleteAgent(req.user.activeOrganizationId, id, req.user.userId);
  if (!result.success) return sendError(res, (result as any).statusCode || 400, (result as any).message || "Delete failed");
  sendResponse(res, 200, true, "Agent removed from organization");
});

export const resendInvite = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  sendError(res, 410, "Use POST /memberships/organizations/:orgId/members/invite instead");
});

// ─── DASHBOARD STATS ─────────────────────────────────────────────────────────────

export const getDashboardStats = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const stats = await adminService.getDashboardStats(req.user.activeOrganizationId);
  sendResponse(res, 200, true, "Dashboard stats retrieved successfully", stats);
});
