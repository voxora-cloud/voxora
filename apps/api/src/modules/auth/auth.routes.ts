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
  validateRequest(authSchema.adminSignup),
  AuthController.adminSignup,
);

// ─── Unified Login ────────────────────────────────────────────────────────────
router.post(
  "/login",
  authRateLimit,
  validateRequest(authSchema.login),
  AuthController.login,
);


// ─── Password Reset ───────────────────────────────────────────────────────────
router.post("/forgot-password", AuthController.forgotPassword);
router.post("/reset-password", AuthController.resetPassword);

router.post("/refresh-token", AuthController.refreshToken);

// ─── Protected ────────────────────────────────────────────────────────────────
router.use(authenticate);

router.post("/logout", AuthController.logout);
router.get("/profile", AuthController.getProfile);

export { router as authRouter };
export default router;
