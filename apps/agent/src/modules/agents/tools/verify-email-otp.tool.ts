import { Tool, ToolExecutionContext, ToolParameterSchema } from "../agent.types";
import { internalApi } from "../../../infrastructure/api/internal.client";

export class VerifyEmailOtpTool implements Tool {
  readonly name = "verify_email_otp";
  readonly description =
    "Verify the 6-digit email OTP provided by the visitor for the active conversation. Call this after an identity verification email was sent and the visitor replies with the code. Sensitive account operations may proceed only when this returns verified: true.";

  readonly parameters: Record<string, ToolParameterSchema> = {
    email: {
      type: "string",
      description: "Email address to which the verification code was sent, when already known. The active conversation challenge is used when omitted.",
      required: false,
    },
    code: {
      type: "string",
      description: "The 6-digit verification code supplied by the visitor.",
      required: true,
    },
    organizationId: {
      type: "string",
      description: "Organization ID. Injected from runtime context.",
      required: false,
    },
    conversationId: {
      type: "string",
      description: "Conversation ID. Injected from runtime context.",
      required: false,
    },
  };

  async execute(args: Record<string, unknown>, context?: ToolExecutionContext): Promise<unknown> {
    try {
      const email = typeof args.email === "string" ? args.email.trim() : "";
      const code = typeof args.code === "string" ? args.code.replace(/\s/g, "") : "";
      if (!/^\d{6}$/.test(code)) {
        return { status: "error", verified: false, message: "A 6-digit code is required" };
      }

      const organizationId =
        context?.organizationId || (typeof args.organizationId === "string" ? args.organizationId : "");
      const conversationId =
        context?.conversationId || (typeof args.conversationId === "string" ? args.conversationId : "");
      if (!organizationId || !conversationId) {
        return { status: "error", verified: false, message: "conversation context is required" };
      }

      const response = await internalApi.post("/email/verify-otp", {
        organizationId,
        conversationId,
        ...(email ? { email } : {}),
        code,
      });

      return {
        status: "ok",
        verified: response.data?.data?.verified === true,
        email: response.data?.data?.email || email || null,
        verifiedAt: response.data?.data?.verifiedAt || null,
      };
    } catch (e: any) {
      return {
        status: "error",
        verified: false,
        message: e?.response?.data?.message || e.message || "OTP verification failed",
      };
    }
  }
}
