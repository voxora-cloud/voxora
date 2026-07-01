import { Request, Response } from "express";
import {
  ObservabilityService,
  IncomingAICallEvent,
} from "./observability.service";
import { sendSuccess, sendError } from "@shared/core/response";
import { AuthenticatedRequest } from "@shared/security/middleware";
import logger from "@shared/core/logger";

export class ObservabilityController {
  /**
   * POST /observability/ai-calls
   *
   * Receives a batch of AI call events from the agent's observability worker
   * and bulk-inserts them into MongoDB.
   *
   * Protected by x-ai-tool-secret — no JWT required.
   */
  static async ingestAICalls(req: Request, res: Response): Promise<void> {
    try {
      const { events } = req.body as { events?: unknown[] };

      if (!Array.isArray(events) || events.length === 0) {
        sendError(res, 400, "Request body must contain a non-empty 'events' array");
        return;
      }

      const MAX_BATCH = 500;
      if (events.length > MAX_BATCH) {
        sendError(res, 400, `Batch size exceeds maximum of ${MAX_BATCH}`);
        return;
      }

      const result = await ObservabilityService.bulkInsert(
        events as IncomingAICallEvent[],
      );

      logger.info("[Observability] AI call events ingested", result);

      sendSuccess(res, result, "Events ingested", 201);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error("[Observability] Failed to ingest AI call events", {
        error: message,
      });
      sendError(res, 500, "Failed to ingest events", message);
    }
  }

  /**
   * GET /observability/ai-calls/summary
   *
   * Returns aggregated AI call metrics for the authenticated organization.
   * Protected by JWT + org membership.
   */
  static async getSummary(req: Request, res: Response): Promise<void> {
    try {
      const { activeOrganizationId } = (req as AuthenticatedRequest).user;
      const days = req.query.days
        ? parseInt(req.query.days as string, 10)
        : 30;

      const summary = await ObservabilityService.getSummary(
        activeOrganizationId,
        days,
      );

      sendSuccess(res, summary, "Observability summary retrieved");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error("[Observability] Failed to get summary", { error: message });
      sendError(res, 500, "Failed to retrieve summary", message);
    }
  }
}
