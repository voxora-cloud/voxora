import { Request, Response } from "express";
import { AuthenticatedRequest } from "@shared/security/middleware/auth";
import NotificationService from "./notification.service";
import logger from "@shared/core/logger";
import { sendSuccess, sendError, sendResponse } from "@shared/core/response";

class NotificationController {
  async getNotifications(req: Request, res: Response) {
    try {
      const authReq = req as AuthenticatedRequest;
      const organizationId = authReq.user.activeOrganizationId;
      const userId = authReq.user.userId;
      
      const notifications = await NotificationService.getNotifications(organizationId, userId);
      
      return sendSuccess(res, notifications, "Notifications fetched successfully");
    } catch (error: any) {
      logger.error("Error fetching notifications:", error);
      return sendError(res, 500, error.message);
    }
  }

  // ─── AI-Internal: Create Notification ──────────────────────────────────────

  async aiCreate(req: Request, res: Response) {
    try {
      const { organizationId, type, title, description, userId } = req.body;

      if (!organizationId || !type || !title || !description) {
        return sendError(res, 400, "organizationId, type, title, and description are required");
      }

      const notif = await NotificationService.create({
        organizationId,
        userId,
        type,
        title,
        description,
      });

      return sendResponse(res, 201, true, "Notification created", { id: notif._id });
    } catch (error: any) {
      logger.error("Error creating AI notification:", error);
      return sendError(res, 500, error.message);
    }
  }
}

export default new NotificationController();
