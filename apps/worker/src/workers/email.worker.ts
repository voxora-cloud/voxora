import { Worker, ConnectionOptions } from "bullmq";
import nodemailer, { Transporter } from "nodemailer";
import { Resend } from "resend";
import sendgridMail from "@sendgrid/mail";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import config, { type EmailProvider } from "../config";

// ── Job payload ──────────────────────────────────────────────────────────────

export interface EmailJobData {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export const EMAIL_QUEUE = "platform:email";

// ── Adapters ─────────────────────────────────────────────────────────────────

interface EmailAdapter {
  send(options: EmailJobData): Promise<void>;
}

class SmtpEmailAdapter implements EmailAdapter {
  private transporter: Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.secure,
      auth: config.email.auth.user
        ? { user: config.email.auth.user, pass: config.email.auth.pass }
        : undefined,
    } as any);
  }

  async send(options: EmailJobData): Promise<void> {
    await this.transporter.sendMail({
      from: `"${config.email.from.name}" <${config.email.from.email}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });
  }
}

class MailhogEmailAdapter implements EmailAdapter {
  private transporter: Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: "localhost",
      port: 1025,
      secure: false,
      ignoreTLS: true,
    } as any);
  }

  async send(options: EmailJobData): Promise<void> {
    await this.transporter.sendMail({
      from: `"${config.email.from.name}" <${config.email.from.email}>`,
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
    const { error } = await this.client.emails.send({
      from: `${config.email.from.name} <${config.email.from.email}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });
    if (error) throw new Error(`Resend error: ${error.message}`);
  }
}

class SendgridEmailAdapter implements EmailAdapter {
  constructor() {
    if (!config.email.sendgridApiKey) throw new Error("SENDGRID_API_KEY is required for SendGrid provider");
    sendgridMail.setApiKey(config.email.sendgridApiKey);
  }

  async send(options: EmailJobData): Promise<void> {
    await sendgridMail.send({
      from: { name: config.email.from.name, email: config.email.from.email },
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });
  }
}

class SesEmailAdapter implements EmailAdapter {
  private client: SESClient;

  constructor() {
    const { accessKeyId, secretAccessKey, region } = config.email.ses;
    if (!accessKeyId || !secretAccessKey) throw new Error("AWS SES credentials are required");
    this.client = new SESClient({
      region: region || "us-east-1",
      credentials: { accessKeyId, secretAccessKey },
    });
  }

  async send(options: EmailJobData): Promise<void> {
    const command = new SendEmailCommand({
      Source: `${config.email.from.name} <${config.email.from.email}>`,
      Destination: { ToAddresses: [options.to] },
      Message: {
        Subject: { Data: options.subject, Charset: "UTF-8" },
        Body: {
          Html: { Data: options.html, Charset: "UTF-8" },
          ...(options.text ? { Text: { Data: options.text, Charset: "UTF-8" } } : {}),
        },
      },
    });
    await this.client.send(command);
  }
}

class DisabledEmailAdapter implements EmailAdapter {
  async send(options: EmailJobData): Promise<void> {
    console.warn(`[Email Worker] Email sending disabled — skipping mail to ${options.to}: "${options.subject}"`);
  }
}

function buildAdapter(provider: EmailProvider): EmailAdapter {
  switch (provider) {
    case "smtp":    return new SmtpEmailAdapter();
    case "mailhog": return new MailhogEmailAdapter();
    case "resend":  return new ResendEmailAdapter();
    case "sendgrid":return new SendgridEmailAdapter();
    case "ses":     return new SesEmailAdapter();
    case "disabled":return new DisabledEmailAdapter();
    default:        return new DisabledEmailAdapter();
  }
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
