import { Request, Response } from "express";
import { AnalyticsService } from "./analytics.service";
import { AuthenticatedRequest } from "@shared/security/middleware";

export class AnalyticsController {
  private static parseDays(value: unknown, fallback: number) {
    const parsed = Number.parseInt(String(value ?? ""), 10);
    return Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), 90) : fallback;
  }

  static async getSummary(req: Request, res: Response) {
    try {
      const { activeOrganizationId, orgRole, userId } = (req as AuthenticatedRequest).user;
      const data = await AnalyticsService.getOwnerSummary(
        activeOrganizationId,
        AnalyticsController.parseDays(req.query.days, 30),
        orgRole === "agent" ? userId : undefined,
      );
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  }

  static async getTrends(req: Request, res: Response) {
    try {
      const { activeOrganizationId, orgRole, userId } = (req as AuthenticatedRequest).user;
      const data = await AnalyticsService.getOwnerTrends(
        activeOrganizationId,
        AnalyticsController.parseDays(req.query.days, 7),
        orgRole === "agent" ? userId : undefined,
      );
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  }

  static async getOwnerSummary(req: Request, res: Response) {
    try {
      const { activeOrganizationId } = (req as AuthenticatedRequest).user;
      const { days } = req.query;
      const data = await AnalyticsService.getOwnerSummary(
        activeOrganizationId,
        AnalyticsController.parseDays(days, 30),
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
        AnalyticsController.parseDays(days, 7),
      );
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  }

}
