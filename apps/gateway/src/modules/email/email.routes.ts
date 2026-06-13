import { Router } from "express";
import { validateAiSecret, validateRequest } from "@shared/security/middleware";
import { sendEmail, verifyAgentOtp } from "./email.controller";
import { emailSchema } from "./email.schema";

const router = Router();

// All email routes are AI-internal only (x-ai-tool-secret)

/**
 * @openapi
 * /email/send:
 *   post:
 *     summary: Send an email message from AI context
 *     tags:
 *       - Email
 *     parameters:
 *       - in: header
 *         name: x-ai-tool-secret
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - to
 *               - subject
 *               - html
 *             properties:
 *               to:
 *                 type: string
 *               subject:
 *                 type: string
 *               html:
 *                 type: string
 *     responses:
 *       200:
 *         description: Email queued/sent successfully
 *       401:
 *         description: Invalid AI secret
 */
router.post(
  "/send",
  validateAiSecret,
  validateRequest(emailSchema.sendEmail),
  sendEmail,
);

/**
 * @openapi
 * /email/verify-otp:
 *   post:
 *     summary: Verify agent OTP registration from AI context
 *     tags:
 *       - Email
 *     parameters:
 *       - in: header
 *         name: x-ai-tool-secret
 *         required: true
 *         schema:
 *           type: string
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
 *         description: OTP verification successful
 *       400:
 *         description: Invalid or expired OTP
 */
router.post(
  "/verify-otp",
  validateAiSecret,
  validateRequest(emailSchema.verifyAgentOtp),
  verifyAgentOtp,
);

export default router;
