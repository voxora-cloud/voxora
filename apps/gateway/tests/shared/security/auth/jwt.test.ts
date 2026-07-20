import { describe, it, expect, vi, beforeAll } from "vitest";
import jwt from "jsonwebtoken";
import {
  generateTokens,
  verifyToken,
  extractTokenFromHeader,
  JWTPayload,
} from "@shared/security/auth/jwt";

// Mock the config module so we don't need real env vars
vi.mock("@shared/infra/config", () => ({
  default: {
    app: {
      env: "test",
    },
    jwt: {
      secret: "test-access-secret",
      expiresIn: "15m",
      refreshSecret: "test-refresh-secret",
      refreshExpiresIn: "7d",
    },
    redis: {
      redisUri: undefined,
      host: "localhost",
      port: 6379,
    },
  },
}));

describe("JWT Utilities", () => {
  const payload = {
    userId: "user-123",
    email: "test@example.com",
    activeOrganizationId: "org-456",
  };

  describe("generateTokens", () => {
    it("should generate access and refresh tokens", () => {
      const tokens = generateTokens(payload);

      expect(tokens).toHaveProperty("accessToken");
      expect(tokens).toHaveProperty("refreshToken");
      expect(typeof tokens.accessToken).toBe("string");
      expect(typeof tokens.refreshToken).toBe("string");
      expect(tokens.accessToken.length).toBeGreaterThan(0);
      expect(tokens.refreshToken.length).toBeGreaterThan(0);
    });

    it("should include correct payload in tokens", () => {
      const tokens = generateTokens(payload);

      const accessDecoded = jwt.decode(tokens.accessToken) as any;
      expect(accessDecoded.userId).toBe(payload.userId);
      expect(accessDecoded.email).toBe(payload.email);
      expect(accessDecoded.activeOrganizationId).toBe(payload.activeOrganizationId);
      expect(accessDecoded.type).toBe("access");

      const refreshDecoded = jwt.decode(tokens.refreshToken) as any;
      expect(refreshDecoded.type).toBe("refresh");
    });

    it("should throw when secrets are missing", async () => {
      const mockModule = await vi.importMock<typeof import("@shared/infra/config")>(
        "@shared/infra/config"
      );
      const original = (mockModule as any).default.jwt.secret;
      (mockModule as any).default.jwt.secret = undefined;

      expect(() => generateTokens(payload)).toThrow("JWT secrets are not configured");

      (mockModule as any).default.jwt.secret = original;
    });
  });

  describe("verifyToken", () => {
    let tokens: { accessToken: string; refreshToken: string };

    beforeAll(() => {
      tokens = generateTokens(payload);
    });

    it("should verify a valid access token", () => {
      const decoded = verifyToken(tokens.accessToken, "access");
      expect(decoded.userId).toBe(payload.userId);
      expect(decoded.email).toBe(payload.email);
      expect(decoded.type).toBe("access");
    });

    it("should verify a valid refresh token", () => {
      const decoded = verifyToken(tokens.refreshToken, "refresh");
      expect(decoded.userId).toBe(payload.userId);
      expect(decoded.type).toBe("refresh");
    });

    it("should default to access token type", () => {
      const decoded = verifyToken(tokens.accessToken);
      expect(decoded.type).toBe("access");
    });

    it("should throw for an invalid token", () => {
      expect(() => verifyToken("not-a-valid-token", "access")).toThrow("Invalid access token");
    });

    it("should throw for a tampered token", () => {
      const tampered = tokens.accessToken.slice(0, -5) + "abcde";
      expect(() => verifyToken(tampered, "access")).toThrow("Invalid access token");
    });
  });

  describe("extractTokenFromHeader", () => {
    it("should extract token from Bearer header", () => {
      const token = extractTokenFromHeader("Bearer abc123");
      expect(token).toBe("abc123");
    });

    it("should return null for missing header", () => {
      expect(extractTokenFromHeader(undefined)).toBeNull();
    });

    it("should return null for non-Bearer header", () => {
      expect(extractTokenFromHeader("Basic abc123")).toBeNull();
    });

    it("should return null for empty string", () => {
      expect(extractTokenFromHeader("")).toBeNull();
    });
  });
});
