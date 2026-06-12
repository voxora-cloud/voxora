export interface SendEmailInput {
  to: string;
  template: "agent_verification_otp" | "conversation_summary";
  variables: Record<string, string>;
  organizationId?: string;
  conversationId?: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface VerifyAgentOtpInput {
  email?: string;
  code: string;
  organizationId: string;
  conversationId: string;
}

export interface VerifyAgentOtpResult {
  success: boolean;
  email?: string;
  verifiedAt?: string;
  statusCode?: number;
  error?: string;
}
