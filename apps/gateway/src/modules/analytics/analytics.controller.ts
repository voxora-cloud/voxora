import { Request, Response } from "express";
import { AnalyticsService } from "./analytics.service";
import { AuthenticatedRequest } from "@shared/security/middleware";

export class AnalyticsController {
  static async getOwnerSummary(req: Request, res: Response) {
    try {
      const { activeOrganizationId } = (req as AuthenticatedRequest).user;
      const { days } = req.query;
      const data = await AnalyticsService.getOwnerSummary(
        activeOrganizationId,
        days ? parseInt(days as string, 10) : 30,
      );
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  }

  static async getOwnerTrends(req: Request, res: Response) {
    try {
      const { activeOrganizationId } = (req as AuthenticatedRequest).user;
      const { days } = req.query;
      const data = await AnalyticsService.getOwnerTrends(
        activeOrganizationId,
        days ? parseInt(days as string, 10) : 7,
      );
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  }

}