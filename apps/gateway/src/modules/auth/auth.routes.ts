import { Router } from "express";
import * as AuthController from "./auth.controller";
import { authenticate, validateRequest, authRateLimit } from "@shared/security/middleware";
import { authSchema } from "./auth.schema";

const router = Router();

// ─── Multi-step Signup ────────────────────────────────────────────────────────
router.post(
  "/initiate-signup",
  authRateLimit,
  validateRequest(authSchema.initiateSignup),
  AuthController.initiateSignup,
);
router.post(
  "/complete-signup",
  authRateLimit,
  validateRequest(authSchema.completeSignup),
  AuthController.completeSignup,
);

// ─── Unified Login ────────────────────────────────────────────────────────────
router.post(
  "/login",
  authRateLimit,
  validateRequest(authSchema.login),
  AuthController.login,
);

// ─── OTP / Verification ───────────────────────────────────────────────────────
router.post(
  "/resend-otp",
  authRateLimit,
  validateRequest(authSchema.resendOTP),
  AuthController.resendOTP,
);
router.post(
  "/verify-otp",
  authRateLimit,
  validateRequest(authSchema.verifyOTP),
  AuthController.verifyOTP,
);
router.post(
  "/reset-password-otp",
  authRateLimit,
  validateRequest(authSchema.resetPasswordWithOTP),
  AuthController.resetPasswordWithOTP,
);


// ─── Password Reset ───────────────────────────────────────────────────────────
router.post("/forgot-password", authRateLimit, validateRequest(authSchema.forgotPassword), AuthController.forgotPassword);
router.get("/reset-password/validate", authRateLimit, AuthController.validateResetPasswordToken);
router.post(
  "/reset-password",
  authRateLimit,
  validateRequest(authSchema.resetPassword),
  AuthController.resetPassword,
);

router.post("/refresh-token", AuthController.refreshToken);

// ─── Protected ────────────────────────────────────────────────────────────────
router.use(authenticate);

router.post("/logout", AuthController.logout);
router.get("/profile", AuthController.getProfile);

export { router as authRouter };
export default router;