import { Tool, ToolExecutionContext, ToolParameterSchema } from "../agent.types";
import { internalApi } from "../../../infrastructure/api/internal.client";

export class SendEmailTool implements Tool {
  readonly name = "send_email";
  readonly description =
    "Send a platform-branded email to a user. For 'agent_verification_otp', the server creates and stores the secure OTP; then use verify_email_otp after the user submits the code. The other supported action is sending a 'conversation_summary' after a conversation ends.";

  readonly parameters: Record<string, ToolParameterSchema> = {
    to: {
      type: "string",
      description: "Recipient email address.",
      required: true,
    },
    template: {
      type: "string",
      description: "Pre-defined template to use: 'agent_verification_otp' or 'conversation_summary'.",
      required: true,
    },
    variables: {
      type: "object",
      description: "Template variables. For 'agent_verification_otp': supply {} because the server generates the OTP. For 'conversation_summary': supply { name, companyName, summary }.",
      required: true,
    },
    replyTo: {
      type: "string",
      description: "Optional reply-to email address.",
      required: false,
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
      const to = typeof args.to === "string" ? args.to.trim() : "";
      if (!to) {
        return { status: "error", message: "Recipient address ('to') is required" };
      }

      const template = typeof args.template === "string" ? args.template.trim() : "";
      if (template !== "agent_verification_otp" && template !== "conversation_summary") {
        return {
          status: "error",
          message: "Invalid template. Must be 'agent_verification_otp' or 'conversation_summary'",
        };
      }

      const variables = typeof args.variables === "object" && args.variables !== null ? args.variables : undefined;
      if (!variables) {
        return { status: "error", message: "Template variables object is required" };
      }

      const organizationId =
        context?.organizationId || (typeof args.organizationId === "string" ? args.organizationId : "");
      const conversationId =
        context?.conversationId || (typeof args.conversationId === "string" ? args.conversationId : "");
      const replyTo = typeof args.replyTo === "string" ? args.replyTo.trim() : undefined;

      const response = await internalApi.post(
        `/email/send`,
        { to, template, variables, organizationId, conversationId, replyTo },
        { timeout: 15000 },
      );

      return {
        status: "ok",
        message: `Template email '${template}' sent successfully`,
        messageId: response.data?.data?.messageId || null,
      };
    } catch (e: any) {
      return { status: "error", message: e?.response?.data?.message || e.message || "Failed to send email" };
    }
  }
}
