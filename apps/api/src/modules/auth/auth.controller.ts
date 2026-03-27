import { Request, Response } from "express";
import { AuthService } from "./auth.service";
import { sendResponse, sendError, asyncHandler } from "@shared/utils/response";
import { AuthenticatedRequest } from "@shared/middleware/auth";

const authService = new AuthService();

// ─── Bootstrap / Setup ───────────────────────────────────────────────────────

export const bootstrapCheck = asyncHandler(async (_req: Request, res: Response) => {
  const required = await AuthService.isBootstrapRequired();
  sendResponse(res, 200, true, "Bootstrap status", { bootstrapRequired: required });
});

export const adminSignup = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, password, organizationName, companyName } = req.body;
  const normalizedOrganizationName = organizationName || companyName;

  const result = await authService.adminSignup({
    name,
    email,
    password,
    organizationName: normalizedOrganizationName,
  });

  if (!result.success) {
    return sendError(res, result.statusCode || 400, result.message || "Signup failed");
  }

  sendResponse(res, 201, true, "Voxora setup completed successfully", result.data);
});

// ─── Login ────────────────────────────────────────────────────────────────────

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const result = await authService.login({ email, password });

  if (!result.success) {
    return sendError(res, result.statusCode || 401, result.message || "Login failed");
  }

  sendResponse(res, 200, true, "Login successful", result.data);
});


// ─── Logout ───────────────────────────────────────────────────────────────────

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const { userId, activeOrganizationId } = (req as AuthenticatedRequest).user;

  await authService.logout(userId, activeOrganizationId);
  sendResponse(res, 200, true, "Logout successful");
});

// ─── Profile ──────────────────────────────────────────────────────────────────

export const getProfile = asyncHandler(async (req: Request, res: Response) => {
  sendResponse(res, 200, true, "Profile retrieved successfully", {
    user: (req as AuthenticatedRequest).user,
  });
});

// ─── Password ─────────────────────────────────────────────────────────────────

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.forgotPassword(req.body.email);
  if (!result.success) {
    return sendError(res, 503, result.message || "Email is not configured");
  }
  sendResponse(res, 200, true, "If an account exists with this email, a password reset link has been sent");
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const { token, newPassword } = req.body;
  const result = await authService.resetPassword(token, newPassword);

  if (!result.success) {
    return sendError(res, result.statusCode || 400, result.message || "Failed to reset password");
  }

  sendResponse(res, 200, true, "Password reset successful");
});


export const refreshToken = asyncHandler(async (req: Request, res: Response) => {
  sendError(res, 501, "Refresh token endpoint not yet implemented");
});
