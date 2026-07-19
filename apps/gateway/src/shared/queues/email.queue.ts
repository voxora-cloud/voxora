import { Queue, ConnectionOptions } from "bullmq";
import config from "@shared/infra/config";
import {
  isEmailEnabled,
  buildInviteEmail,
  buildWelcomeEmail,
  buildEmailVerificationOTPEmail,
  buildForgotPasswordOTPEmail,
  buildAgentVerificationOTPEmail,
  buildConversationSummaryEmail,
  buildTicketLifecycleEmail,
  buildDomainVerificationPendingEmail,
  buildDomainVerificationCompletedEmail,
  buildFreeCreditGrantedEmail,
  buildUsageThresholdWarningEmail,
  buildUsageExhaustedEmail,
  buildSubscriptionActivatedEmail,
  buildChannelVerifiedEmail,
  type TicketEmailDetails,
  type TicketEmailEvent,
  type EmailOptions,
} from "../utils/email";
import { resolveFromEmail } from "../utils/email-sender";

export const EMAIL_QUEUE = "platform-email";

const connection: ConnectionOptions = {
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  maxRetriesPerRequest: null,
};

const emailQueue = new Queue<EmailOptions>(EMAIL_QUEUE, {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});

async function enqueueEmail(
  jobName:
    | "invite"
    | "welcome"
    | "email_verification_otp"
    | "password_reset_otp"
    | "agent_verification_otp"
    | "conversation_summary"
    | "ticket_created"
    | "ticket_updated"
    | "ticket_resolved"
    | "ticket_closed"
    | "domain_verification_pending"
    | "domain_verification_completed"
    | "free_credit_granted"
    | "usage_threshold_warning"
    | "usage_exhausted"
    | "subscription_activated"
    | "channel_verified",
  payload: { to: string; subject: string; html: string; text?: string },
): Promise<void> {
  const from = await resolveFromEmail();
  await emailQueue.add(jobName, { ...payload, from });
}

export async function enqueueInviteEmail(
  to: string,
  inviterName: string,
  role: string,
  inviteToken: string,
): Promise<boolean> {
  if (!isEmailEnabled()) return false;
  const { subject, html } = await buildInviteEmail(inviterName, role, inviteToken);
  await enqueueEmail("invite", { to, subject, html });
  return true;
}

export async function enqueueWelcomeEmail(
  to: string,
  name: string,
  role: string,
): Promise<boolean> {
  if (!isEmailEnabled()) return false;
  const { subject, html } = await buildWelcomeEmail(name, role);
  await enqueueEmail("welcome", { to, subject, html });
  return true;
}

export async function enqueueEmailVerificationOTPEmail(
  to: string,
  name: string,
  otp: string,
): Promise<boolean> {
  if (!isEmailEnabled()) return false;
  const { subject, html } = await buildEmailVerificationOTPEmail(name, otp);
  await enqueueEmail("email_verification_otp", { to, subject, html });
  return true;
}

export async function enqueueForgotPasswordOTPEmail(
  to: string,
  name: string,
  otp: string,
): Promise<boolean> {
  if (!isEmailEnabled()) return false;
  const { subject, html } = await buildForgotPasswordOTPEmail(name, otp);
  await enqueueEmail("password_reset_otp", { to, subject, html });
  return true;
}

export async function enqueueRawEmail(
  to: string,
  subject: string,
  html: string,
  text?: string,
): Promise<boolean> {
  if (!isEmailEnabled()) return false;
  const from = await resolveFromEmail();
  await emailQueue.add("raw_email", { to, subject, html, text, from });
  return true;
}

export async function enqueueAgentVerificationOTPEmail(
  to: string,
  otp: string,
): Promise<boolean> {
  if (!isEmailEnabled()) return false;
  const { subject, html, text } = await buildAgentVerificationOTPEmail(otp);
  await enqueueEmail("agent_verification_otp", { to, subject, html, text });
  return true;
}

export async function enqueueConversationSummaryEmail(
  to: string,
  name: string,
  companyName: string,
  summary: string,
): Promise<boolean> {
  if (!isEmailEnabled()) return false;
  const { subject, html, text } = await buildConversationSummaryEmail(name, companyName, summary);
  await enqueueEmail("conversation_summary", { to, subject, html, text });
  return true;
}

export async function enqueueTicketLifecycleEmail(
  to: string,
  event: TicketEmailEvent,
  details: TicketEmailDetails,
): Promise<boolean> {
  if (!isEmailEnabled()) return false;
  const { subject, html, text } = await buildTicketLifecycleEmail(event, details);
  await enqueueEmail(`ticket_${event}`, { to, subject, html, text });
  return true;
}

export async function enqueueDomainVerificationPendingEmail(
  to: string,
  name: string,
  domain: string,
  token: string,
): Promise<boolean> {
  if (!isEmailEnabled()) return false;
  const { subject, html, text } = await buildDomainVerificationPendingEmail(name, domain, token);
  await enqueueEmail("domain_verification_pending", { to, subject, html, text });
  return true;
}

export async function enqueueDomainVerificationCompletedEmail(
  to: string,
  name: string,
  domain: string,
): Promise<boolean> {
  if (!isEmailEnabled()) return false;
  const { subject, html, text } = await buildDomainVerificationCompletedEmail(name, domain);
  await enqueueEmail("domain_verification_completed", { to, subject, html, text });
  return true;
}

// ── Billing & channel lifecycle enqueue functions ────────────────────────────

export async function enqueueFreeCreditGrantedEmail(
  to: string,
  name: string,
  creditAmount: string,
  resetDate: string,
): Promise<boolean> {
  if (!isEmailEnabled()) return false;
  const { subject, html, text } = await buildFreeCreditGrantedEmail(name, creditAmount, resetDate);
  await enqueueEmail("free_credit_granted", { to, subject, html, text });
  return true;
}

export async function enqueueUsageThresholdWarningEmail(
  to: string,
  name: string,
  pct: number,
  used: number,
  limit: number,
  resetDate: string,
): Promise<boolean> {
  if (!isEmailEnabled()) return false;
  const { subject, html, text } = await buildUsageThresholdWarningEmail(name, pct, used, limit, resetDate);
  await enqueueEmail("usage_threshold_warning", { to, subject, html, text });
  return true;
}

export async function enqueueUsageExhaustedEmail(
  to: string,
  name: string,
  used: number,
  limit: number,
  resetDate: string,
): Promise<boolean> {
  if (!isEmailEnabled()) return false;
  const { subject, html, text } = await buildUsageExhaustedEmail(name, used, limit, resetDate);
  await enqueueEmail("usage_exhausted", { to, subject, html, text });
  return true;
}

export async function enqueueSubscriptionActivatedEmail(
  to: string,
  name: string,
  planName: string,
  nextBillingDate: string,
): Promise<boolean> {
  if (!isEmailEnabled()) return false;
  const { subject, html, text } = await buildSubscriptionActivatedEmail(name, planName, nextBillingDate);
  await enqueueEmail("subscription_activated", { to, subject, html, text });
  return true;
}

export async function enqueueChannelVerifiedEmail(
  to: string,
  name: string,
  channelType: string,
  channelName: string,
): Promise<boolean> {
  if (!isEmailEnabled()) return false;
  const { subject, html, text } = await buildChannelVerifiedEmail(name, channelType, channelName);
  await enqueueEmail("channel_verified", { to, subject, html, text });
  return true;
}

export { emailQueue };
