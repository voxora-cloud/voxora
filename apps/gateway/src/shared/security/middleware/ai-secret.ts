import { Request, Response, NextFunction } from "express";
import { sendError } from "@shared/core/response";

/**
 * Middleware: validates the x-ai-tool-secret header.
 *
 * Used to secure all AI-internal endpoints that are called from apps/agent tools.
 * Set AI_TOOL_SECRET in both apps/gateway and apps/agent .env to the same value.
 */
export const validateAiSecret = (req: Request, res: Response, next: NextFunction): void => {
  const secret = process.env.AI_TOOL_SECRET;
  const isDev = (process.env.NODE_ENV || "development") === "development";

  if (!secret) {
    if (isDev) {
      // In dev, allow through if secret is not configured
      next();
      return;
    }
    sendError(res, 503, "AI tool secret is not configured");
    return;
  }

  const provided = req.headers["x-ai-tool-secret"];
  if (!provided || provided !== secret) {
    sendError(res, 401, "Unauthorized AI tool request");
    return;
  }

  next();
};
