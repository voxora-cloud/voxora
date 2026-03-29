import { Worker, ConnectionOptions } from "bullmq";
import nodemailer, { Transporter } from "nodemailer";
import { Resend } from "resend";
import config, { type EmailProvider } from "../config";

// ── Job payload ──────────────────────────────────────────────────────────────

export interface EmailJobData {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: {
    name: string;
    email: string;
  };
}

export const EMAIL_QUEUE = "platform-email";

// ── Adapters ─────────────────────────────────────────────────────────────────

interface EmailAdapter {
  send(options: EmailJobData): Promise<void>;
}

class MailhogEmailAdapter implements EmailAdapter {
  private transporter: Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.secure,
      auth: config.email.auth.user
        ? { user: config.email.auth.user, pass: config.email.auth.pass }
        : undefined,
      ignoreTLS: true,
    } as any);
  }

  async send(options: EmailJobData): Promise<void> {
    const fromName = options.from?.name || config.email.from.name;
    const fromEmail = options.from?.email || config.email.from.email;

    await this.transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });
  }
}

class ResendEmailAdapter implements EmailAdapter {
  private client: Resend;

  constructor() {
    if (!config.email.resendApiKey) throw new Error("RESEND_API_KEY is required for Resend provider");
    this.client = new Resend(config.email.resendApiKey);
  }

  async send(options: EmailJobData): Promise<void> {
    const fromName = options.from?.name || config.email.from.name;
    const fromEmail = options.from?.email || config.email.from.email;

    const { error } = await this.client.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });
    if (error) throw new Error(`Resend error: ${error.message}`);
  }
}

class DisabledEmailAdapter implements EmailAdapter {
  async send(options: EmailJobData): Promise<void> {
    console.warn(`[Email Worker] Email sending disabled — skipping mail to ${options.to}: "${options.subject}"`);
  }
}

function buildAdapter(provider: EmailProvider): EmailAdapter {
  const providers: Record<EmailProvider, () => EmailAdapter> = {
    mailhog: () => new MailhogEmailAdapter(),
    resend: () => new ResendEmailAdapter(),
    disabled: () => new DisabledEmailAdapter(),
  };

  const factory = providers[provider];
  if (!factory) {
    return new DisabledEmailAdapter();
  }

  return factory();
}

// ── Worker ───────────────────────────────────────────────────────────────────

export function startEmailWorker() {
  const adapter = buildAdapter(config.email.provider);

  const connection: ConnectionOptions = {
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password,
    maxRetriesPerRequest: null,
  };

  const worker = new Worker<EmailJobData, void, string>(
    EMAIL_QUEUE,
    async (job) => {
      console.log(`[Email Worker] Sending "${job.data.subject}" to ${job.data.to}`);
      await adapter.send(job.data);
    },
    { connection, concurrency: config.worker.concurrency },
  );

  worker.on("completed", (job) =>
    console.log(`[Email Worker] Job ${job.id} completed — mail to ${job.data.to}`),
  );
  worker.on("failed", (job, err) =>
    console.error(`[Email Worker] Job ${job?.id} failed:`, err.message),
  );
  worker.on("error", (err) =>
    console.error("[Email Worker] Worker error:", err),
  );

  console.log(`[Email Worker] Started. Provider: "${config.email.provider}" | Queue: "${EMAIL_QUEUE}"`);
  return worker;
}
