import { Request, Response } from "express";
import { AuthService } from "./auth.service";
import { sendResponse, sendError, asyncHandler } from "@shared/core/response";
import { AuthenticatedRequest } from "@shared/security/middleware/auth";

const authService = new AuthService();

export const initiateSignup = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.initiateSignup(req.body);
  if (!result.success) {
    return sendError(res, result.statusCode || 400, result.message || "Initiate signup failed");
  }
  sendResponse(res, 200, true, result.message || "OTP sent", null);
});


export const completeSignup = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.completeSignup(req.body);
  if (!result.success) {
    return sendError(res, result.statusCode || 400, result.message || "Complete signup failed");
  }
  sendResponse(res, 200, true, "Signup completed successfully", result.data);
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
  sendResponse(res, 200, true, "If an account exists with this email, a reset code has been sent");
});



export const verifyOTP = asyncHandler(async (req: Request, res: Response) => {
  const { email, code, type } = req.body;
  const result = await authService.verifyOTP(email, code, type);

  if (!result.success) {
    return sendError(res, result.statusCode || 400, result.message || "OTP verification failed");
  }

  sendResponse(res, 200, true, "OTP verified successfully");
});

export const resendOTP = asyncHandler(async (req: Request, res: Response) => {
  const { email, type } = req.body;
  const result = await authService.resendOTP(email, type);

  if (!result.success) {
    return sendError(res, result.statusCode || 400, result.message || "Failed to resend OTP");
  }

  sendResponse(res, 200, true, "OTP sent successfully");
});

export const resetPasswordWithOTP = asyncHandler(async (req: Request, res: Response) => {
  const { email, code, newPassword } = req.body;
  const result = await authService.resetPasswordWithOTP(email, code, newPassword);

  if (!result.success) {
    return sendError(res, result.statusCode || 400, result.message || "Failed to reset password");
  }

  sendResponse(res, 200, true, "Password reset successful");
});

export const validateResetPasswordToken = asyncHandler(async (req: Request, res: Response) => {
  const token = String(req.query.token || "");
  const result = await authService.validatePasswordResetToken(token);

  if (!result.success) {
    return sendError(res, result.statusCode || 400, result.message || "Invalid reset link");
  }

  sendResponse(res, 200, true, "Reset link is valid");
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
