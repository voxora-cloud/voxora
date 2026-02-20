import { Router } from "express";
import * as AuthController from "./auth.controller";
import { authenticate, validateRequest, authRateLimit } from "@shared/middleware";
import { authSchema } from "./auth.schema";

const router = Router();

// Public routes with rate limiting
router.post(
  "/register",
  authRateLimit,
  validateRequest(authSchema.register),
  AuthController.register,
);

router.post(
  "/login",
  authRateLimit,
  validateRequest(authSchema.login),
  AuthController.login,
);

// Admin/Agent specific auth routes
router.post(
  "/admin/signup",
  authRateLimit,
  validateRequest(authSchema.adminSignup),
  AuthController.adminSignup,
);

router.post(
  "/admin/login",
  authRateLimit,
  validateRequest(authSchema.login),
  AuthController.adminLogin,
);

router.post(
  "/agent/login",
  authRateLimit,
  validateRequest(authSchema.login),
  AuthController.agentLogin,
);

router.post(
  "/accept-invite",
  validateRequest(authSchema.acceptInvite),
  AuthController.acceptInvite,
);

router.post(
  "/forgot-password",
  validateRequest(authSchema.forgotPassword),
  AuthController.forgotPassword,
);

router.post(
  "/reset-password",
  validateRequest(authSchema.resetPassword),
  AuthController.resetPassword,
);

router.post("/refresh-token", AuthController.refreshToken);

// Protected routes - below routes are authenticated
router.use(authenticate);

router.post("/logout", AuthController.logout);
router.get("/profile", AuthController.getProfile);

export default router;
