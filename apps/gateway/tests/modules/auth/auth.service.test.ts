import { describe, it, expect, vi, beforeEach } from "vitest";
import { AuthService } from "@modules/auth/auth.service";
import { User, Membership } from "@shared/models";
import { OrganizationService } from "@modules/organization/organization.service";
import { WidgetService } from "@modules/widget/widget.service";
import { generateOTP } from "@shared/security/auth/otp";
import { enqueueEmailVerificationOTPEmail } from "@shared/queues/email.queue";

// Mock dependencies
vi.mock("@shared/models", () => ({
  User: {
    findOne: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    findByIdAndUpdate: vi.fn(),
  },
  Membership: {
    find: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn(),
  },
  Organization: {},
}));

vi.mock("@shared/security/auth/jwt", () => ({
  generateTokens: vi.fn().mockReturnValue({
    accessToken: "mock-access-token",
    refreshToken: "mock-refresh-token",
  }),
}));

vi.mock("@shared/security/auth/otp", () => ({
  generateOTP: vi.fn().mockReturnValue("123456"),
  hashOTP: vi.fn().mockResolvedValue("hashed-otp-123456"),
  verifyOTP: vi.fn().mockResolvedValue(true),
}));

vi.mock("@shared/infra/redis", () => ({
  redisClient: {
    del: vi.fn().mockResolvedValue(1),
    set: vi.fn().mockResolvedValue("OK"),
    setEx: vi.fn().mockResolvedValue("OK"),
    get: vi.fn().mockResolvedValue(null),
  },
}));

vi.mock("@shared/utils/email", () => ({
  isEmailEnabled: vi.fn().mockReturnValue(true),
}));

vi.mock("@shared/queues/email.queue", () => ({
  enqueueWelcomeEmail: vi.fn().mockResolvedValue({}),
  enqueueEmailVerificationOTPEmail: vi.fn().mockResolvedValue({}),
  enqueueForgotPasswordOTPEmail: vi.fn().mockResolvedValue({}),
}));

vi.mock("@modules/organization/organization.service", () => ({
  OrganizationService: {
    createOrganization: vi.fn().mockResolvedValue({
      organization: {
        _id: { toString: () => "org-123" },
        name: "Test Org",
        slug: "test-org",
        plan: "free",
      },
    }),
  },
}));

vi.mock("@modules/widget/widget.service", () => {
  return {
    WidgetService: class {
      getWidget = vi.fn().mockResolvedValue({
        verifiedDomain: "example.com",
        domainVerificationToken: "token-123",
        domainVerificationStatus: "verified",
      });
    },
  };
});

describe("AuthService", () => {
  let authService: AuthService;

  beforeEach(() => {
    vi.clearAllMocks();
    authService = new AuthService();
  });

  describe("initiateSignup", () => {
    it("should return 400 if user already exists, is active, and is email verified", async () => {
      (User.findOne as any).mockResolvedValue({
        isActive: true,
        emailVerified: true,
      });

      const result = await authService.initiateSignup({
        name: "Test User",
        email: "test@example.com",
      });

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(400);
      expect(result.message).toBe("Email already registered");
    });

    it("should create a pending user and issue OTP if user does not exist", async () => {
      (User.findOne as any).mockResolvedValue(null);
      
      const mockUserSave = vi.fn().mockResolvedValue({});
      const mockUser = {
        _id: { toString: () => "user-123" },
        name: "Test User",
        email: "test@example.com",
        isActive: false,
        emailVerified: false,
        save: mockUserSave,
      };
      
      (User.create as any).mockResolvedValue(mockUser);

      const result = await authService.initiateSignup({
        name: "Test User",
        email: "test@example.com",
      });

      expect(User.create).toHaveBeenCalledWith({
        name: "Test User",
        email: "test@example.com",
        isActive: false,
        emailVerified: false,
      });
      expect(mockUser.save).toHaveBeenCalled();
      expect(generateOTP).toHaveBeenCalled();
      expect(enqueueEmailVerificationOTPEmail).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });
  });

  describe("completeSignup", () => {
    it("should return 404 if user not found", async () => {
      (User.findOne as any).mockResolvedValue(null);

      const result = await authService.completeSignup({
        email: "test@example.com",
        organizationName: "Test Org",
        password: "password123",
      });

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(404);
      expect(result.message).toBe("User not found");
    });

    it("should return 403 if email is not verified", async () => {
      (User.findOne as any).mockResolvedValue({
        emailVerified: false,
      });

      const result = await authService.completeSignup({
        email: "test@example.com",
        organizationName: "Test Org",
        password: "password123",
      });

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(403);
      expect(result.message).toBe("Email not verified");
    });

    it("should complete signup, create organization, and return session tokens", async () => {
      const mockUserSave = vi.fn().mockResolvedValue({});
      const mockUser = {
        _id: { toString: () => "user-123" },
        name: "Test User",
        email: "test@example.com",
        isActive: false,
        emailVerified: true,
        save: mockUserSave,
      };

      (User.findOne as any).mockResolvedValue(mockUser);

      const result = await authService.completeSignup({
        email: "test@example.com",
        organizationName: "Test Org",
        password: "password123",
      });

      expect(mockUser.isActive).toBe(true);
      expect(mockUser.save).toHaveBeenCalled();
      expect(OrganizationService.createOrganization).toHaveBeenCalledWith(
        "user-123",
        { name: "Test Org" }
      );
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty("accessToken");
      expect(result.data).toHaveProperty("refreshToken");
      expect(result.data?.organization.name).toBe("Test Org");
    });
  });

  describe("login", () => {
    it("should return 401 if user not found or password does not match", async () => {
      // User not found
      (User.findOne as any).mockReturnValue({
        select: vi.fn().mockResolvedValue(null),
      });

      let result = await authService.login({
        email: "test@example.com",
        password: "wrongpassword",
      });

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(401);
      expect(result.message).toBe("Invalid email or password");

      // Password mismatch
      const mockUser = {
        _id: { toString: () => "user-123" },
        email: "test@example.com",
        comparePassword: vi.fn().mockResolvedValue(false),
      };
      (User.findOne as any).mockReturnValue({
        select: vi.fn().mockResolvedValue(mockUser),
      });

      result = await authService.login({
        email: "test@example.com",
        password: "wrongpassword",
      });

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(401);
      expect(mockUser.comparePassword).toHaveBeenCalledWith("wrongpassword");
    });

    it("should return 403 if email is not verified", async () => {
      const mockUser = {
        _id: { toString: () => "user-123" },
        email: "test@example.com",
        emailVerified: false,
        comparePassword: vi.fn().mockResolvedValue(true),
      };
      (User.findOne as any).mockReturnValue({
        select: vi.fn().mockResolvedValue(mockUser),
      });

      const result = await authService.login({
        email: "test@example.com",
        password: "password123",
      });

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(403);
      expect(result.message).toBe("Please verify your email before logging in");
    });

    it("should return 403 if user has no memberships", async () => {
      const mockUser = {
        _id: "user-123",
        email: "test@example.com",
        emailVerified: true,
        comparePassword: vi.fn().mockResolvedValue(true),
      };
      (User.findOne as any).mockReturnValue({
        select: vi.fn().mockResolvedValue(mockUser),
      });
      (Membership.find as any).mockReturnValue({
        populate: vi.fn().mockResolvedValue([]),
      });

      const result = await authService.login({
        email: "test@example.com",
        password: "password123",
      });

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(403);
      expect(result.message).toBe(
        "You do not belong to any organization. Please contact your administrator."
      );
    });

    it("should issue token directly if user has exactly one membership", async () => {
      const mockUser = {
        _id: { toString: () => "user-123" },
        email: "test@example.com",
        name: "Test User",
        emailVerified: true,
        comparePassword: vi.fn().mockResolvedValue(true),
      };
      (User.findOne as any).mockReturnValue({
        select: vi.fn().mockResolvedValue(mockUser),
      });

      const mockMembership = {
        role: "admin",
        organizationId: {
          _id: "org-123",
          name: "Test Org",
        },
      };
      (Membership.find as any).mockReturnValue({
        populate: vi.fn().mockResolvedValue([mockMembership]),
      });

      const result = await authService.login({
        email: "test@example.com",
        password: "password123",
      });

      expect(result.success).toBe(true);
      expect(result.data?.requiresOrgSelection).toBe(false);
      expect(result.data?.accessToken).toBe("mock-access-token");
      expect(result.data?.role).toBe("admin");
    });
  });
});
