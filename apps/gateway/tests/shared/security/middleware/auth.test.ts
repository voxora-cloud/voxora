import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import {
  authenticate,
  resolveOrganization,
  requireRole,
  authenticateWidget,
  AuthenticatedRequest,
} from "@shared/security/middleware/auth";

// ─── Mocks ───────────────────────────────────────────────────────────────

vi.mock("@shared/infra/config", () => ({
  default: {
    jwt: { secret: "test-secret" },
  },
}));

vi.mock("@shared/security/auth/jwt", () => ({
  verifyToken: vi.fn(),
  extractTokenFromHeader: vi.fn(),
  JWTPayload: {},
}));

vi.mock("@shared/models", () => ({
  User: {
    findById: vi.fn(),
    findByIdAndUpdate: vi.fn().mockReturnValue({ exec: vi.fn().mockResolvedValue({}) }),
  },
  Membership: {
    findOne: vi.fn(),
  },
  Organization: {
    findById: vi.fn(),
  },
  MembershipRole: {},
}));

vi.mock("@shared/core/response", () => ({
  sendError: vi.fn((res: Response, status: number, message: string) => {
    res.status(status).json({ success: false, message });
    return res;
  }),
}));

import { verifyToken, extractTokenFromHeader } from "@shared/security/auth/jwt";
import { User, Membership, Organization } from "@shared/models";
import { sendError } from "@shared/core/response";

describe("Auth Middleware", () => {
  let req: Partial<Request> & { headers: { authorization?: string } };
  let res: Partial<Response> & { status: any; json: any };
  let next: NextFunction;

  const mockUserFindById = (val: any) => {
    (User.findById as any).mockReturnValue({
      select: vi.fn().mockResolvedValue(val),
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock behaviors
    (extractTokenFromHeader as any).mockReturnValue(null);
    (verifyToken as any).mockReturnValue({
      userId: "user-123",
      email: "test@example.com",
      activeOrganizationId: "org-456",
    });
    mockUserFindById({ _id: "user-123", isActive: true });
    (User.findByIdAndUpdate as any).mockReturnValue({ exec: vi.fn().mockResolvedValue({}) });
    (Membership.findOne as any).mockResolvedValue({ role: "admin" });
    (Organization.findById as any).mockResolvedValue({ isActive: true });

    req = {
      headers: {},
      query: {},
      get: vi.fn(),
    } as any;

    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      setHeader: vi.fn(),
    } as any;

    next = vi.fn();
  });

  // ─────────── authenticate ───────────

  describe("authenticate", () => {
    it("should return 401 when no token is provided", async () => {
      (extractTokenFromHeader as any).mockReturnValue(null);

      await authenticate(req as Request, res as Response, next);

      expect(sendError).toHaveBeenCalledWith(res, 401, "Access token is required");
      expect(next).not.toHaveBeenCalled();
    });

    it("should return 401 for an invalid token", async () => {
      (extractTokenFromHeader as any).mockReturnValue("bad-token");
      (verifyToken as any).mockImplementation(() => {
        throw new Error("Invalid token");
      });

      await authenticate(req as Request, res as Response, next);

      expect(sendError).toHaveBeenCalledWith(res, 401, "Invalid or expired token");
      expect(next).not.toHaveBeenCalled();
    });

    it("should return 401 when user is not found or inactive", async () => {
      (extractTokenFromHeader as any).mockReturnValue("valid-token");
      (verifyToken as any).mockReturnValue({
        userId: "user-123",
        email: "test@example.com",
        activeOrganizationId: "org-456",
      });
      mockUserFindById(null);

      await authenticate(req as Request, res as Response, next);

      expect(sendError).toHaveBeenCalledWith(res, 401, "Invalid token or user not found");
      expect(next).not.toHaveBeenCalled();
    });

    it("should return 403 when user is not a member of the organization", async () => {
      (extractTokenFromHeader as any).mockReturnValue("valid-token");
      (verifyToken as any).mockReturnValue({
        userId: "user-123",
        email: "test@example.com",
        activeOrganizationId: "org-456",
      });
      mockUserFindById({ _id: "user-123", isActive: true });
      (Membership.findOne as any).mockResolvedValue(null);

      await authenticate(req as Request, res as Response, next);

      expect(sendError).toHaveBeenCalledWith(
        res,
        403,
        "You are not a member of this organization"
      );
      expect(next).not.toHaveBeenCalled();
    });

    it("should attach user and call next for valid token and active membership", async () => {
      (extractTokenFromHeader as any).mockReturnValue("valid-token");
      (verifyToken as any).mockReturnValue({
        userId: "user-123",
        email: "test@example.com",
        activeOrganizationId: "org-456",
      });
      mockUserFindById({
        _id: "user-123",
        isActive: true,
      });
      (Membership.findOne as any).mockResolvedValue({
        role: "admin",
      });

      await authenticate(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      const authReq = req as AuthenticatedRequest;
      expect(authReq.user).toEqual({
        userId: "user-123",
        email: "test@example.com",
        activeOrganizationId: "org-456",
        orgRole: "admin",
      });
    });

    it("should accept token from query string", async () => {
      req.query = { token: "query-token" };
      (extractTokenFromHeader as any).mockReturnValue(null);
      (verifyToken as any).mockReturnValue({
        userId: "user-123",
        email: "test@example.com",
        activeOrganizationId: "pending",
      });
      mockUserFindById({ _id: "user-123", isActive: true });

      await authenticate(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(verifyToken).toHaveBeenCalledWith("query-token", "access");
    });

    it("should allow pending organization without membership check", async () => {
      (extractTokenFromHeader as any).mockReturnValue("valid-token");
      (verifyToken as any).mockReturnValue({
        userId: "user-123",
        email: "test@example.com",
        activeOrganizationId: "pending",
      });
      mockUserFindById({ _id: "user-123", isActive: true });

      await authenticate(req as Request, res as Response, next);

      expect(Membership.findOne).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
      const authReq = req as AuthenticatedRequest;
      expect(authReq.user.activeOrganizationId).toBe("pending");
    });
  });

  // ─────────── resolveOrganization ───────────

  describe("resolveOrganization", () => {
    beforeEach(() => {
      (req as any).user = { activeOrganizationId: "org-456" };
    });

    it("should return 404 when organization is not found", async () => {
      (Organization.findById as any).mockResolvedValue(null);

      await resolveOrganization(req as Request, res as Response, next);

      expect(sendError).toHaveBeenCalledWith(res, 404, "Organization not found or inactive");
      expect(next).not.toHaveBeenCalled();
    });

    it("should return 404 when organization is inactive", async () => {
      (Organization.findById as any).mockResolvedValue({ isActive: false });

      await resolveOrganization(req as Request, res as Response, next);

      expect(sendError).toHaveBeenCalledWith(res, 404, "Organization not found or inactive");
      expect(next).not.toHaveBeenCalled();
    });

    it("should call next for active organization", async () => {
      (Organization.findById as any).mockResolvedValue({ isActive: true });

      await resolveOrganization(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
    });
  });

  // ─────────── requireRole ───────────

  describe("requireRole", () => {
    it("should deny access when no orgRole is present", () => {
      (req as any).user = {};

      const middleware = requireRole("admin");
      middleware(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Authentication required",
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("should allow owner for admin-required route", () => {
      (req as any).user = { orgRole: "owner" };

      const middleware = requireRole("admin");
      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
    });

    it("should allow admin for admin-required route", () => {
      (req as any).user = { orgRole: "admin" };

      const middleware = requireRole("admin");
      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
    });

    it("should deny agent for admin-required route", () => {
      (req as any).user = { orgRole: "agent" };

      const middleware = requireRole("admin");
      middleware(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Access denied – insufficient permissions",
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("should allow any role for agent-required route", () => {
      (req as any).user = { orgRole: "agent" };

      const middleware = requireRole("agent");
      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
    });

    it("should deny admin for owner-only route", () => {
      (req as any).user = { orgRole: "admin" };

      const middleware = requireRole("owner");
      middleware(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });
  });

  // ─────────── authenticateWidget ───────────

  describe("authenticateWidget", () => {
    it("should return 401 when no token is provided", async () => {
      (extractTokenFromHeader as any).mockReturnValue(null);

      await authenticateWidget(req as Request, res as Response, next);

      expect(sendError).toHaveBeenCalledWith(res, 401, "Widget access token is required");
      expect(next).not.toHaveBeenCalled();
    });

    it("should return 401 for invalid widget token type", async () => {
      (extractTokenFromHeader as any).mockReturnValue("widget-token");
      vi.spyOn(jwt, "verify").mockReturnValue({ type: "access" } as any);

      await authenticateWidget(req as Request, res as Response, next);

      expect(sendError).toHaveBeenCalledWith(res, 401, "Invalid widget access token");
      expect(next).not.toHaveBeenCalled();
    });

    it("should attach widget session and call next for valid widget token", async () => {
      (extractTokenFromHeader as any).mockReturnValue("widget-token");
      const widgetSession = { type: "widget_session", widgetId: "widget-123" };
      vi.spyOn(jwt, "verify").mockReturnValue(widgetSession as any);

      await authenticateWidget(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect((req as any).widgetSession).toEqual(widgetSession);
    });
  });
});
