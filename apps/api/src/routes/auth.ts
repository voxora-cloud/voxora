import { Router } from "express";
import {
  register,
  login,
  logout,
  refreshToken,
  getProfile,
  adminSignup,
  adminLogin,
  agentLogin,
  acceptInvite,
  forgotPassword,
  resetPassword,
} from "../controllers/authController";
import { authenticate, validateRequest, authRateLimit } from "../middleware";
import { userValidation } from "../utils/validation";

const router = Router();

// Public routes with rate limiting
router.post(
  "/register",
  authRateLimit,
  validateRequest(userValidation.register),
  register,
);

router.post(
  "/login",
  authRateLimit,
  validateRequest(userValidation.login),
  login,
);

// Admin/Agent specific auth routes
router.post(
  "/admin/signup",
  authRateLimit,
  validateRequest(userValidation.adminSignup),
  adminSignup,
);

router.post(
  "/admin/login",
  authRateLimit,
  validateRequest(userValidation.login),
  adminLogin,
);

router.post(
  "/agent/login",
  authRateLimit,
  validateRequest(userValidation.login),
  agentLogin,
);

router.post(
  "/accept-invite",
  validateRequest(userValidation.acceptInvite),
  acceptInvite,
);


router.post(
  "/forgot-password",
  validateRequest(userValidation.forgotPassword),
  forgotPassword,
);

router.post(
  "/reset-password",
  validateRequest(userValidation.resetPassword),
  resetPassword,
);

router.post("/refresh-token", refreshToken);

// Protected routes. - below routes are authenticated
router.use(authenticate);

router.post("/logout", logout);
router.get("/profile", getProfile);


export default router;
