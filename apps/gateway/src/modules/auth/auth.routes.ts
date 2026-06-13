import { Router } from "express";
import * as AuthController from "./auth.controller";
import { authenticate, validateRequest, authRateLimit } from "@shared/security/middleware";
import { authSchema } from "./auth.schema";

const router = Router();

// ─── Multi-step Signup ────────────────────────────────────────────────────────

/**
 * @openapi
 * /auth/initiate-signup:
 *   post:
 *     summary: Initiate multi-step signup process
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Signup process initiated, OTP sent
 *       400:
 *         description: Bad request
 */
router.post(
  "/initiate-signup",
  authRateLimit,
  validateRequest(authSchema.initiateSignup),
  AuthController.initiateSignup,
);

/**
 * @openapi
 * /auth/complete-signup:
 *   post:
 *     summary: Complete signup by registering user details
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - name
 *               - password
 *               - otp
 *             properties:
 *               email:
 *                 type: string
 *               name:
 *                 type: string
 *               password:
 *                 type: string
 *               otp:
 *                 type: string
 *     responses:
 *       200:
 *         description: Registration successful, tokens returned
 *       400:
 *         description: Invalid parameters or invalid/expired OTP
 */
router.post(
  "/complete-signup",
  authRateLimit,
  validateRequest(authSchema.completeSignup),
  AuthController.completeSignup,
);

// ─── Unified Login ────────────────────────────────────────────────────────────

/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: Authenticate user and return tokens
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful, tokens returned
 *       400:
 *         description: Invalid credentials
 */
router.post(
  "/login",
  authRateLimit,
  validateRequest(authSchema.login),
  AuthController.login,
);

// ─── OTP / Verification ───────────────────────────────────────────────────────

/**
 * @openapi
 * /auth/resend-otp:
 *   post:
 *     summary: Resend OTP verification code to email
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: OTP resent successfully
 *       400:
 *         description: Failed to resend OTP
 */
router.post(
  "/resend-otp",
  authRateLimit,
  validateRequest(authSchema.resendOTP),
  AuthController.resendOTP,
);

/**
 * @openapi
 * /auth/verify-otp:
 *   post:
 *     summary: Verify OTP code
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - otp
 *             properties:
 *               email:
 *                 type: string
 *               otp:
 *                 type: string
 *     responses:
 *       200:
 *         description: OTP verified successfully
 *       400:
 *         description: Invalid or expired OTP
 */
router.post(
  "/verify-otp",
  authRateLimit,
  validateRequest(authSchema.verifyOTP),
  AuthController.verifyOTP,
);

/**
 * @openapi
 * /auth/reset-password-otp:
 *   post:
 *     summary: Reset password with OTP verification
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - otp
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               otp:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password reset completed successfully
 *       400:
 *         description: Invalid parameters or OTP
 */
router.post(
  "/reset-password-otp",
  authRateLimit,
  validateRequest(authSchema.resetPasswordWithOTP),
  AuthController.resetPasswordWithOTP,
);

// ─── Password Reset ───────────────────────────────────────────────────────────

/**
 * @openapi
 * /auth/forgot-password:
 *   post:
 *     summary: Trigger password reset flow (sends reset email)
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password reset email sent
 */
router.post("/forgot-password", authRateLimit, validateRequest(authSchema.forgotPassword), AuthController.forgotPassword);



/**
 * @openapi
 * /auth/refresh-token:
 *   post:
 *     summary: Refresh JWT access token
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Access token refreshed successfully
 *       401:
 *         description: Invalid refresh token
 */
router.post("/refresh-token", AuthController.refreshToken);

// ─── Protected ────────────────────────────────────────────────────────────────
router.use(authenticate);

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     summary: Log out current user (revoke tokens)
 *     tags:
 *       - Authentication
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 *       401:
 *         description: Unauthorized
 */
router.post("/logout", AuthController.logout);

/**
 * @openapi
 * /auth/profile:
 *   get:
 *     summary: Retrieve profile details for the authenticated user
 *     tags:
 *       - Authentication
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get("/profile", AuthController.getProfile);

export { router as authRouter };
export default router;