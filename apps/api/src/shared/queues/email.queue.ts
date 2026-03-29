import { Queue, ConnectionOptions } from "bullmq";
import config from "@shared/config";
import {
  isEmailEnabled,
  buildInviteEmail,
  buildPasswordResetEmail,
  buildWelcomeEmail,
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
  jobName: "invite" | "password_reset" | "welcome",
  payload: { to: string; subject: string; html: string; text?: string },
  organizationId?: string,
): Promise<void> {
  const from = await resolveFromEmail(organizationId);
  await emailQueue.add(jobName, { ...payload, from });
}

export async function enqueueInviteEmail(
  to: string,
  inviterName: string,
  role: string,
  inviteToken: string,
  teamNames: string,
  organizationId?: string,
): Promise<boolean> {
  if (!isEmailEnabled()) return false;
  const { subject, html } = await buildInviteEmail(inviterName, role, inviteToken, teamNames);
  await enqueueEmail("invite", { to, subject, html }, organizationId);
  return true;
}

export async function enqueuePasswordResetEmail(
  to: string,
  name: string,
  resetToken: string,
  organizationId?: string,
): Promise<boolean> {
  if (!isEmailEnabled()) return false;
  const { subject, html } = await buildPasswordResetEmail(name, resetToken);
  await enqueueEmail("password_reset", { to, subject, html }, organizationId);
  return true;
}

export async function enqueueWelcomeEmail(
  to: string,
  name: string,
  role: string,
  organizationId?: string,
): Promise<boolean> {
  if (!isEmailEnabled()) return false;
  const { subject, html } = await buildWelcomeEmail(name, role);
  await enqueueEmail("welcome", { to, subject, html }, organizationId);
  return true;
}

export { emailQueue };
