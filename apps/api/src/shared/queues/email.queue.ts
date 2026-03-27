import { Queue, ConnectionOptions } from "bullmq";
import config from "@shared/config";
import {
  isEmailEnabled,
  buildInviteEmail,
  buildPasswordResetEmail,
  buildWelcomeEmail,
  type EmailOptions,
} from "@shared/utils/email";

export const EMAIL_QUEUE = "platform:email";

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

export async function enqueueInviteEmail(
  to: string,
  inviterName: string,
  role: string,
  inviteToken: string,
  teamNames: string,
): Promise<boolean> {
  if (!isEmailEnabled()) return false;
  const { subject, html } = buildInviteEmail(inviterName, role, inviteToken, teamNames);
  await emailQueue.add("invite", { to, subject, html });
  return true;
}

export async function enqueuePasswordResetEmail(
  to: string,
  name: string,
  resetToken: string,
): Promise<boolean> {
  if (!isEmailEnabled()) return false;
  const { subject, html } = buildPasswordResetEmail(name, resetToken);
  await emailQueue.add("password_reset", { to, subject, html });
  return true;
}

export async function enqueueWelcomeEmail(
  to: string,
  name: string,
  role: string,
): Promise<boolean> {
  if (!isEmailEnabled()) return false;
  const { subject, html } = buildWelcomeEmail(name, role);
  await emailQueue.add("welcome", { to, subject, html });
  return true;
}

export { emailQueue };
