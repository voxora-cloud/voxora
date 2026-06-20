import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response, NextFunction } from "express";
import { ObjectSchema } from "joi";
import { validateRequest } from "@shared/security/middleware/validation";

vi.mock("@shared/core/response", () => ({
  sendError: vi.fn((res: Response, status: number, message: string, error?: string) => {
    res.status(status).json({ success: false, message, error });
    return res;
  }),
}));

import { sendError } from "@shared/core/response";

describe("validateRequest middleware", () => {
  let req: Partial<Request>;
  let res: Partial<Response> & { status: any; json: any };
  let next: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();

    req = { body: {} };

    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as any;

    next = vi.fn();
  });

  const createMockSchema = (valid: boolean, errorMessage?: string): ObjectSchema => {
    return {
      validate: vi.fn().mockReturnValue({
        error: valid
          ? undefined
          : {
              details: [{ message: errorMessage || "\"field\" is required" }],
            },
      }),
    } as unknown as ObjectSchema;
  };

  it("should call next when validation passes", () => {
    req.body = { email: "test@example.com", password: "secret123" };
    const schema = createMockSchema(true);

    const middleware = validateRequest(schema, "body");
    middleware(req as Request, res as Response, next);

    expect(schema.validate).toHaveBeenCalledWith(req.body);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("should return 400 when body validation fails", () => {
    req.body = { email: "test@example.com" };
    const schema = createMockSchema(false, "\"password\" is required");

    const middleware = validateRequest(schema, "body");
    middleware(req as Request, res as Response, next);

    expect(next).not.toHaveBeenCalled();
    expect(sendError).toHaveBeenCalledWith(
      res,
      400,
      "Validation error",
      "\"password\" is required"
    );
  });

  it("should validate query parameters when specified", () => {
    req = { query: { page: "1" } } as any;
    const schema = createMockSchema(true);

    const middleware = validateRequest(schema, "query");
    middleware(req as Request, res as Response, next);

    expect(schema.validate).toHaveBeenCalledWith(req.query);
    expect(next).toHaveBeenCalled();
  });

  it("should validate route params when specified", () => {
    req = { params: { id: "123" } } as any;
    const schema = createMockSchema(true);

    const middleware = validateRequest(schema, "params");
    middleware(req as Request, res as Response, next);

    expect(schema.validate).toHaveBeenCalledWith(req.params);
    expect(next).toHaveBeenCalled();
  });

  it("should default to body validation", () => {
    req.body = { name: "Test" };
    const schema = createMockSchema(true);

    const middleware = validateRequest(schema);
    middleware(req as Request, res as Response, next);

    expect(schema.validate).toHaveBeenCalledWith(req.body);
    expect(next).toHaveBeenCalled();
  });

  it("should join multiple validation errors with commas", () => {
    req.body = {};
    const schema = {
      validate: vi.fn().mockReturnValue({
        error: {
          details: [
            { message: "\"email\" is required" },
            { message: "\"password\" is required" },
          ],
        },
      }),
    } as unknown as ObjectSchema;

    const middleware = validateRequest(schema, "body");
    middleware(req as Request, res as Response, next);

    expect(sendError).toHaveBeenCalledWith(
      res,
      400,
      "Validation error",
      "\"email\" is required, \"password\" is required"
    );
  });
});
