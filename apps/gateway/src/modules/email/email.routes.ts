import { Router } from "express";
import { validateAiSecret, validateRequest } from "@shared/security/middleware";
import { sendEmail, verifyAgentOtp } from "./email.controller";
import { emailSchema } from "./email.schema";

const router = Router();

// All email routes are AI-internal only (x-ai-tool-secret)
router.post(
  "/send",
  validateAiSecret,
  validateRequest(emailSchema.sendEmail),
  sendEmail,
);

router.post(
  "/verify-otp",
  validateAiSecret,
  validateRequest(emailSchema.verifyAgentOtp),
  verifyAgentOtp,
);

export default router;
