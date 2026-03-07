import { Router } from "express";
import * as AuthController from "./auth.controller";
import { authenticate, validateRequest, authRateLimit } from "@shared/middleware";
import { authSchema } from "./auth.schema";

const router = Router();

// ─── Bootstrap (public) ───────────────────────────────────────────────────────
router.get("/bootstrap-status", AuthController.bootstrapCheck);

router.post(
  "/setup",
  authRateLimit,
  AuthController.adminSignup,
);

// ─── Unified Login ────────────────────────────────────────────────────────────
router.post(
  "/login",
  authRateLimit,
  validateRequest(authSchema.login),
  AuthController.login,
);

// Legacy aliases (kept for backward compat)
router.post("/admin/signup", authRateLimit, AuthController.adminSignup);
router.post("/admin/login", authRateLimit, validateRequest(authSchema.login), AuthController.adminLogin);
router.post("/agent/login", authRateLimit, validateRequest(authSchema.login), AuthController.agentLogin);

// ─── Password Reset ───────────────────────────────────────────────────────────
router.post("/forgot-password", AuthController.forgotPassword);
router.post("/reset-password", AuthController.resetPassword);

// ─── Deprecated / Redirected ──────────────────────────────────────────────────
router.post("/accept-invite", AuthController.acceptInvite);
router.post("/refresh-token", AuthController.refreshToken);

// ─── Protected ────────────────────────────────────────────────────────────────
router.use(authenticate);

router.post("/logout", AuthController.logout);
router.get("/profile", AuthController.getProfile);

export { router as authRouter };
export default router;
