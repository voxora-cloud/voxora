import { Request, Response } from "express";
import { AuthService } from "./auth.service";
import { sendResponse, sendError, asyncHandler } from "@shared/utils/response";
import { AuthenticatedRequest } from "@shared/middleware/auth";

const authService = new AuthService();

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, password, role } = req.body;

  try {
    const { user, tokens } = await AuthService.register({ name, email, password, role });
    sendResponse(res, 201, true, "User registered successfully", { user, tokens });
  } catch (error: any) {
    sendError(res, 400, error.message);
  }
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    const { user, tokens } = await AuthService.login(email, password);
    sendResponse(res, 200, true, "Login successful", { user, tokens });
  } catch (error: any) {
    sendError(res, 401, error.message);
  }
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as AuthenticatedRequest).user.userId;

  try {
    await AuthService.logout(userId);
    sendResponse(res, 200, true, "Logout successful");
  } catch (error: any) {
    sendError(res, 500, "Logout failed");
  }
});

export const refreshToken = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;

  try {
    const tokens = await AuthService.refreshToken(refreshToken);
    sendResponse(res, 200, true, "Token refreshed successfully", { tokens });
  } catch (error: any) {
    sendError(res, 401, "Invalid refresh token");
  }
});

export const getProfile = asyncHandler(async (req: Request, res: Response) => {
  try {
    sendResponse(res, 200, true, "Profile retrieved successfully", {
      user: (req as AuthenticatedRequest).user,
    });
  } catch (error: any) {
    sendError(res, 500, "Failed to retrieve profile");
  }
});

export const adminSignup = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, password, companyName } = req.body;

  try {
    const result = await authService.adminSignup({ name, email, password, companyName });

    if (!result.success) {
      return sendError(res, result.statusCode || 400, result.message || "Signup failed");
    }

    sendResponse(res, 201, true, "Admin account created successfully", result.data);
  } catch (error: any) {
    sendError(res, 400, error.message);
  }
});

export const adminLogin = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    const result = await authService.adminLogin({ email, password });

    if (!result.success) {
      return sendError(res, result.statusCode || 401, result.message || "Login failed");
    }

    sendResponse(res, 200, true, "Login successful", result.data);
  } catch (error: any) {
    sendError(res, 401, error.message);
  }
});

export const agentLogin = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    const result = await authService.agentLogin({ email, password });

    if (!result.success) {
      return sendError(res, result.statusCode || 401, result.message || "Login failed");
    }

    sendResponse(res, 200, true, "Login successful", result.data);
  } catch (error: any) {
    sendError(res, 401, error.message);
  }
});

export const acceptInvite = asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.body;

  try {
    const result = await authService.acceptInvite(token);

    if (!result.success) {
      return sendError(res, result.statusCode || 400, result.message || "Failed to accept invitation");
    }

    sendResponse(res, 200, true, "Invitation accepted successfully", result.data);
  } catch (error: any) {
    sendError(res, 500, error.message || "Internal server error");
  }
});

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;

  try {
    await authService.forgotPassword(email);
    sendResponse(res, 200, true, "If an account exists with this email, a password reset link has been sent");
  } catch (error: any) {
    return sendError(res, 500, error.message || "Internal server error");
  }
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const { token, newPassword } = req.body;

  try {
    const result = await authService.resetPassword(token, newPassword);

    if (!result.success) {
      return sendError(res, result.statusCode || 400, result.message || "Failed to reset password");
    }

    sendResponse(res, 200, true, "Password reset successful", result.data);
  } catch (error: any) {
    return sendError(res, 500, error.message || "Internal server error");
  }
});
