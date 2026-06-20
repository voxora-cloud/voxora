import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response, NextFunction } from "express";
import { errorHandler, notFound } from "@shared/security/middleware/error-handler";

vi.mock("@shared/infra/config", () => ({
  default: {
    app: { env: "development" },
    rateLimit: { windowMs: 900000, maxRequests: 100 },
  },
}));

vi.mock("@shared/core/logger", () => ({
  default: {
    log: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock("express-rate-limit", () => ({
  default: vi.fn((options: any) => {
    return (req: Request, res: Response, next: NextFunction) => next();
  }),
}));

import config from "@shared/infra/config";
import logger from "@shared/core/logger";

describe("Error Handler Middleware", () => {
  let req: Partial<Request> & { get: any };
  let res: Partial<Response> & { status: any; json: any };
  let next: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();

    req = {
      originalUrl: "/api/v1/test",
      method: "GET",
      ip: "127.0.0.1",
      get: vi.fn().mockReturnValue("test-agent"),
      url: "/api/v1/test",
    } as any;

    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      getHeader: vi.fn(),
    } as any;

    next = vi.fn();
  });

  describe("errorHandler", () => {
    it("should return 500 for generic errors", () => {
      const error = new Error("Something broke");

      errorHandler(error, req as Request, res as Response, next);

      expect(logger.error).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Something broke",
          requestId: expect.any(String),
        })
      );
    });

    it("should use custom statusCode when present on error", () => {
      const error = new Error("Not found") as any;
      error.statusCode = 404;

      errorHandler(error, req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("should include stack trace in development", () => {
      (config as any).app.env = "development";
      const error = new Error("Dev error");

      errorHandler(error, req as Request, res as Response, next);

      const response = (res.json as any).mock.calls[0][0];
      expect(response.stack).toBeDefined();
    });

    it("should hide details in production", () => {
      (config as any).app.env = "production";
      const error = new Error("Sensitive error");

      errorHandler(error, req as Request, res as Response, next);

      const response = (res.json as any).mock.calls[0][0];
      expect(response.message).toBe("Something went wrong!");
      expect(response.stack).toBeUndefined();
    });
  });

  describe("notFound", () => {
    it("should return 404 with route message", () => {
      notFound(req as Request, res as Response);

      expect(logger.warn).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Route /api/v1/test not found",
        })
      );
    });
  });
});
