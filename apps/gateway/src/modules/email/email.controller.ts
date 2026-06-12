import { Request, Response } from "express";
import { asyncHandler, sendError, sendResponse } from "@shared/core/response";
import { EmailService } from "./email.service";

const emailService = new EmailService();

export const sendEmail = asyncHandler(async (req: Request, res: Response) => {
  const { to, template, variables, organizationId, conversationId } = req.body;

  const result = await emailService.sendEmail({
    to,
    template,
    variables,
    organizationId,
    conversationId,
  });

  if (!result.success) {
    return sendError(res, 503, result.error || "Failed to send email");
  }

  sendResponse(res, 200, true, "Email sent successfully", {
    messageId: result.messageId,
  });
});

export const verifyAgentOtp = asyncHandler(async (req: Request, res: Response) => {
  const { email, code, organizationId, conversationId } = req.body;

  const result = await emailService.verifyAgentOtp({
    email,
    code,
    organizationId,
    conversationId,
  });

  if (!result.success) {
    return sendError(res, result.statusCode || 400, result.error || "OTP verification failed");
  }

  sendResponse(res, 200, true, "Email OTP verified successfully", {
    verified: true,
    email: result.email,
    verifiedAt: result.verifiedAt,
  });
});
