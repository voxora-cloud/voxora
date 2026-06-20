import { describe, it, expect, vi } from "vitest";
import express, { Request, Response, NextFunction } from "express";
import request from "supertest";
import { authenticate, requireRole } from "@shared/security/middleware";

vi.mock("@shared/infra/config", () => ({
  default: {
    jwt: { secret: "test-secret" },
    app: { env: "test" },
    rateLimit: { windowMs: 900000, maxRequests: 100 },
  },
}));

vi.mock("@shared/security/auth/jwt", () => ({
  verifyToken: vi.fn(),
  extractTokenFromHeader: vi.fn(),
}));

vi.mock("@shared/models", () => ({
  User: {
    findById: vi.fn().mockReturnValue({
      select: vi.fn().mockResolvedValue({ _id: "user-123", isActive: true }),
    }),
    findByIdAndUpdate: vi.fn().mockReturnValue({ exec: vi.fn().mockResolvedValue({}) }),
  },
  Membership: {
    findOne: vi.fn().mockResolvedValue({ role: "admin" }),
  },
  Organization: {
    findById: vi.fn().mockResolvedValue({ isActive: true }),
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

describe("Gateway Integration Tests", () => {
  const buildApp = () => {
    const app = express();
    app.use(express.json());

    // Health check route
    app.get("/api/v1/health", (req, res) => {
      res.json({ success: true, message: "API is healthy", timestamp: new Date().toISOString() });
    });

    // Protected route
    app.get("/api/v1/protected", authenticate, (req, res) => {
      res.json({ success: true, message: "Protected data" });
    });

    // Admin-only route
    app.get("/api/v1/admin", authenticate, requireRole("admin"), (req, res) => {
      res.json({ success: true, message: "Admin data" });
    });

    return app;
  };

  describe("Health Check", () => {
    it("should return healthy status", async () => {
      const app = buildApp();
      const response = await request(app).get("/api/v1/health");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("API is healthy");
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe("Protected Routes", () => {
    it("should reject request without authorization header", async () => {
      const app = buildApp();
      (extractTokenFromHeader as any).mockReturnValue(null);

      const response = await request(app).get("/api/v1/protected");

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Access token is required");
    });

    it("should allow request with valid token", async () => {
      const app = buildApp();
      (extractTokenFromHeader as any).mockReturnValue("valid-token");
      (verifyToken as any).mockReturnValue({
        userId: "user-123",
        email: "test@example.com",
        activeOrganizationId: "org-456",
      });

      const response = await request(app)
        .get("/api/v1/protected")
        .set("Authorization", "Bearer valid-token");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Protected data");
    });
  });

  describe("Role-Based Access Control", () => {
    it("should deny agent accessing admin route", async () => {
      const app = buildApp();
      (extractTokenFromHeader as any).mockReturnValue("valid-token");
      (verifyToken as any).mockReturnValue({
        userId: "user-123",
        email: "test@example.com",
        activeOrganizationId: "org-456",
      });

      const { Membership } = await import("@shared/models");
      (Membership.findOne as any).mockResolvedValue({ role: "agent" });

      const response = await request(app)
        .get("/api/v1/admin")
        .set("Authorization", "Bearer valid-token");

      expect(response.status).toBe(403);
      expect(response.body.message).toBe("Access denied – insufficient permissions");
    });

    it("should allow admin accessing admin route", async () => {
      const app = buildApp();
      (extractTokenFromHeader as any).mockReturnValue("valid-token");
      (verifyToken as any).mockReturnValue({
        userId: "user-123",
        email: "test@example.com",
        activeOrganizationId: "org-456",
      });

      const { Membership } = await import("@shared/models");
      (Membership.findOne as any).mockResolvedValue({ role: "admin" });

      const response = await request(app)
        .get("/api/v1/admin")
        .set("Authorization", "Bearer valid-token");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Admin data");
    });
  });
});
