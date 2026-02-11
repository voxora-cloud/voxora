import { Request, Response } from "express";
import { AgentService } from "../services/AgentService";
import { sendResponse, sendError, asyncHandler } from "../utils/response";
import { AuthenticatedRequest } from "../middleware/auth";

const agentService = new AgentService();

// Helper to ensure param is string (not string array)
const getParamAsString = (param: string | string[] | undefined): string => {
  if (Array.isArray(param)) return param[0];
  return param || '';
};

// =================
// AGENT PROFILE
// =================

export const getProfile = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const agent = await agentService.getAgentProfile(req.user.userId);

      if (!agent) {
        return sendError(res, 404, "Agent not found");
      }

      sendResponse(res, 200, true, "Profile retrieved successfully", agent);
    } catch (error: any) {
      sendError(res, 500, error.message);
    }
  },
);

export const updateProfile = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const agent = await agentService.updateAgentProfile(
        req.user.userId,
        req.body,
      );

      if (!agent) {
        return sendError(res, 404, "Agent not found");
      }

      sendResponse(res, 200, true, "Profile updated successfully", agent);
    } catch (error: any) {
      sendError(res, 500, error.message);
    }
  },
);

export const updateStatus = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { status } = req.body;

    try {
      const result = await agentService.updateAgentStatus(
        req.user.userId,
        status,
      );

      if (!result) {
        return sendError(res, 404, "Agent not found");
      }

      sendResponse(res, 200, true, "Status updated successfully", result);
    } catch (error: any) {
      sendError(res, 500, error.message);
    }
  },
);

// =================
// TEAM INFORMATION
// =================

export const getTeams = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const teams = await agentService.getAgentTeams(req.user.userId);

      if (!teams) {
        return sendError(res, 404, "Agent not found");
      }

      sendResponse(res, 200, true, "Teams retrieved successfully", teams);
    } catch (error: any) {
      sendError(res, 500, error.message);
    }
  },
);

export const getTeamMembers = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const id = getParamAsString(req.params.id);

    try {
      const members = await agentService.getTeamMembers(req.user.userId, id);

      if (!members) {
        return sendError(res, 403, "Access denied - not a member of this team");
      }

      sendResponse(
        res,
        200,
        true,
        "Team members retrieved successfully",
        members,
      );
    } catch (error: any) {
      sendError(res, 500, error.message);
    }
  },
);

// =================
// AGENT STATS
// =================

export const getStats = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const stats = await agentService.getAgentStats(req.user.userId);

      if (!stats) {
        return sendError(res, 404, "Agent not found");
      }

      sendResponse(res, 200, true, "Stats retrieved successfully", stats);
    } catch (error: any) {
      sendError(res, 500, error.message);
    }
  },
);
