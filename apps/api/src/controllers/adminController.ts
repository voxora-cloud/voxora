import { Request, Response } from "express";
import { AdminService } from "../services/AdminService";
import { sendResponse, sendError, asyncHandler } from "../utils/response";
import { AuthenticatedRequest } from "../middleware/auth";

const adminService = new AdminService();

// Helper to ensure param is string (not string array)
const getParamAsString = (param: string | string[] | undefined): string => {
  if (Array.isArray(param)) return param[0];
  return param || '';
};

// =================
// TEAM MANAGEMENT
// =================

export const getTeams = asyncHandler(async (req: Request, res: Response) => {
  const { page = 1, limit = 10, search } = req.query;

  try {
    const result = await adminService.getTeams({
      page: Number(page),
      limit: Number(limit),
      search: search as string,
    });

    // console.log("Teams retrieved:", result);

    sendResponse(res, 200, true, "Teams retrieved successfully", result);
  } catch (error: any) {
    sendError(res, 500, error.message);
  }
});

export const getTeamById = asyncHandler(async (req: Request, res: Response) => {
  const id = getParamAsString(req.params.id);

  try {
    const team = await adminService.getTeamById(id);

    if (!team) {
      return sendError(res, 404, "Team not found");
    }

    sendResponse(res, 200, true, "Team retrieved successfully", team);
  } catch (error: any) {
    sendError(res, 500, error.message);
  }
});

export const createTeam = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const teamData = {
        ...req.body,
        createdBy: req.user.userId,
      };

      const team = await adminService.createTeam(teamData);
      sendResponse(res, 201, true, "Team created successfully", team);
    } catch (error: any) {
      sendError(res, 400, error.message);
    }
  },
);

export const updateTeam = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const id = getParamAsString(req.params.id);

    try {
      const updateData = {
        ...req.body,
        updatedBy: req.user.userId,
      };

      const team = await adminService.updateTeam(id, updateData);

      if (!team) {
        return sendError(res, 404, "Team not found");
      }

      sendResponse(res, 200, true, "Team updated successfully", team);
    } catch (error: any) {
      sendError(res, 500, error.message);
    }
  },
);

export const deleteTeam = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const id = getParamAsString(req.params.id);

    try {
      const result = await adminService.deleteTeam(id, req.user.userId);

      if (!result) {
        return sendError(res, 404, "Team not found");
      }

      sendResponse(res, 200, true, "Team deleted successfully");
    } catch (error: any) {
      sendError(res, 500, error.message);
    }
  },
);

// =================
// AGENT MANAGEMENT
// =================

export const getAgents = asyncHandler(async (req: Request, res: Response) => {
  const { page = 1, limit = 10, teamId, status, search } = req.query;

  try {
    const options = {
      page: Number(page),
      limit: Number(limit),
      teamId: teamId as string,
      status: status as string,
      search: search as string,
    };

    const result = await adminService.getAgents(options);
    sendResponse(res, 200, true, "Agents retrieved successfully", result);
  } catch (error: any) {
    sendError(res, 500, error.message);
  }
});

export const getAgentById = asyncHandler(
  async (req: Request, res: Response) => {
    const id = getParamAsString(req.params.id);

    try {
      const agent = await adminService.getAgentById(id);

      if (!agent) {
        return sendError(res, 404, "Agent not found");
      }

      sendResponse(res, 200, true, "Agent retrieved successfully", agent);
    } catch (error: any) {
      sendError(res, 500, error.message);
    }
  },
);

export const inviteAgent = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const inviteData = {
        ...req.body,
        invitedBy: req.user.userId,
      };

      const result = await adminService.inviteAgent(inviteData);

      if (!result.success) {
        return sendError(
          res,
          result.statusCode || 400,
          result.message || "Invite failed",
        );
      }

      sendResponse(res, 201, true, "Agent invited successfully", result.data);
    } catch (error: any) {
      sendError(res, 500, error.message);
    }
  },
);

export const updateAgent = asyncHandler(async (req: Request, res: Response) => {
  const id = getParamAsString(req.params.id);

  try {
    const result = await adminService.updateAgent(id, req.body);

    if (!result.success) {
      return sendError(
        res,
        result.statusCode || 400,
        result.message || "Update failed",
      );
    }

    sendResponse(res, 200, true, "Agent updated successfully", result.data);
  } catch (error: any) {
    sendError(res, 500, error.message);
  }
});

export const deleteAgent = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const id = getParamAsString(req.params.id);

    try {
      const result = await adminService.deleteAgent(id, req.user.userId);

      if (!result.success) {
        return sendError(
          res,
          result.statusCode || 400,
          result.message || "Delete failed",
        );
      }

      sendResponse(res, 200, true, "Agent deleted successfully");
    } catch (error: any) {
      sendError(res, 500, error.message);
    }
  },
);

export const resendInvite = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const id = getParamAsString(req.params.id);

    try {
      const result = await adminService.resendAgentInvite(id, req.user.userId);
      if (!result.success) {
        return sendError(
          res,
          result.statusCode || 400,
          result.message || "Resend invite failed",
        );
      }
      sendResponse(res, 200, true, "Invitation resent successfully");
    } catch (error: any) {
      sendError(res, 500, error.message);
    }
  },
);

export const createWidget = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const widgetData = {
        ...req.body,
        userId: req.user.userId,
      };

      const widget = await adminService.createWidget(widgetData);
      sendResponse(res, 201, true, "Widget created successfully", widget);
    } catch (error: any) {
      sendError(res, 400, error.message);
    }
  },
);

export const getWidget = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const result = await adminService.getWidget(req.user.userId);
      sendResponse(res, 200, true, "Widget retrieved successfully", result);
    } catch (error: any) {
      sendError(res, 500, error.message);
    }
  },
);

export const updateWidget = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const updateData = {
        ...req.body,
        userId: req.user.userId,
      };

      const widget = await adminService.updateWidget(
        req.user.userId,
        updateData,
      );
      sendResponse(res, 200, true, "Widget updated successfully", widget);
    } catch (error: any) {
      sendError(res, 400, error.message);
    }
  },
);

// =================
// DASHBOARD STATS
// =================

export const getDashboardStats = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const stats = await adminService.getDashboardStats();
      console.log("Dashboard stats retrieved:", stats);
      sendResponse(
        res,
        200,
        true,
        "Dashboard stats retrieved successfully",
        stats,
      );
    } catch (error: any) {
      sendError(res, 500, error.message);
    }
  },
);
