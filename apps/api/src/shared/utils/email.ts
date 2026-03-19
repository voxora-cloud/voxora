import nodemailer from "nodemailer";
import { Resend } from "resend";
import sendgridMail from "@sendgrid/mail";
import config from "@shared/config";
import logger from "./logger";

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

interface EmailAdapter {
  send(options: EmailOptions): Promise<{ messageId?: string }>;
}

type EmailProvider = "smtp" | "resend" | "sendgrid";

class SmtpEmailAdapter implements EmailAdapter {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.secure,
      auth: config.email.auth.user
        ? {
          user: config.email.auth.user,
          pass: config.email.auth.pass,
        }
        : undefined,
    } as any);

    this.transporter.set("logger", false);
    this.transporter.set("debug", false);
  }

  async send(options: EmailOptions): Promise<{ messageId?: string }> {
    const info = await this.transporter.sendMail({
      from: `"${config.email.from.name}" <${config.email.from.email}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    return { messageId: info.messageId };
  }
}

class ResendEmailAdapter implements EmailAdapter {
  private client: Resend;

  constructor() {
    if (!config.email.resendApiKey) {
      throw new Error("RESEND_API_KEY is required for EMAIL_PROVIDER=resend");
    }
    this.client = new Resend(config.email.resendApiKey);
  }

  async send(options: EmailOptions): Promise<{ messageId?: string }> {
    const response = await this.client.emails.send({
      from: `"${config.email.from.name}" <${config.email.from.email}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    if ((response as any).error) {
      throw new Error((response as any).error.message || "Resend send failed");
    }

    return { messageId: (response as any).data?.id };
  }
}

class SendgridEmailAdapter implements EmailAdapter {
  constructor() {
    if (!config.email.sendgridApiKey) {
      throw new Error("SENDGRID_API_KEY is required for EMAIL_PROVIDER=sendgrid");
    }
    sendgridMail.setApiKey(config.email.sendgridApiKey);
  }

  async send(options: EmailOptions): Promise<{ messageId?: string }> {
    const [response] = await sendgridMail.send({
      from: {
        email: config.email.from.email,
        name: config.email.from.name,
      },
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    return {
      messageId:
        (response.headers &&
          (response.headers["x-message-id"] as string | undefined)) ||
        undefined,
    };
  }
}

class DisabledEmailAdapter implements EmailAdapter {
  async send(): Promise<{ messageId?: string }> {
    throw new Error("No usable email provider is configured");
  }
}

function hasResendConfig(): boolean {
  return Boolean(config.email.resendApiKey);
}

function hasSendgridConfig(): boolean {
  return Boolean(config.email.sendgridApiKey);
}

function getCandidateProviders(): EmailProvider[] {
  const configured = config.email.provider;
  const candidates: EmailProvider[] = [];

  if (configured !== "auto") {
    if (configured === "smtp" || configured === "resend" || configured === "sendgrid") {
      candidates.push(configured);
    }
  }

  if (hasResendConfig() && !candidates.includes("resend")) {
    candidates.push("resend");
  }
  if (hasSendgridConfig() && !candidates.includes("sendgrid")) {
    candidates.push("sendgrid");
  }
  if (!candidates.includes("smtp")) {
    candidates.push("smtp");
  }

  return candidates;
}

function buildAdapter(provider: EmailProvider): EmailAdapter {
  switch (provider) {
    case "resend":
      return new ResendEmailAdapter();
    case "sendgrid":
      return new SendgridEmailAdapter();
    case "smtp":
      return new SmtpEmailAdapter();
  }
}

function createEmailAdapter(): { adapter: EmailAdapter; provider: EmailProvider | "disabled" } {
  const candidates = getCandidateProviders();

  for (const provider of candidates) {
    try {
      const adapter = buildAdapter(provider);
      logger.info("Email provider initialized", {
        provider,
        configuredProvider: config.email.provider,
      });
      return { adapter, provider };
    } catch (error) {
      logger.warn("Email provider initialization failed, trying next provider", {
        provider,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  logger.warn("No usable email provider found. Emails will be disabled.", {
    configuredProvider: config.email.provider,
  });

  return { adapter: new DisabledEmailAdapter(), provider: "disabled" };
}

class EmailService {
  private adapter: EmailAdapter;
  private activeProvider: EmailProvider | "disabled";

  constructor() {
    const selection = createEmailAdapter();
    this.adapter = selection.adapter;
    this.activeProvider = selection.provider;
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      const mailOptions = {
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || this.stripHtml(options.html),
      };

      const info = await this.adapter.send(mailOptions);

      logger.info("Email sent successfully", {
        to: options.to,
        subject: options.subject,
        provider: this.activeProvider,
        messageId: info.messageId || "n/a",
      });

      return true;
    } catch (error) {
      logger.error("Failed to send email", {
        to: options.to,
        subject: options.subject,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return false;
    }
  }

  async sendInviteEmail(
    to: string,
    inviterName: string,
    role: string,
    token: string,
    teamNames: string,
  ): Promise<boolean> {
    const inviteUrl = `${config.app.clientUrl}/accept-invite?token=${token}`;

    const hasTeams = teamNames && teamNames.trim().length > 0;
    const formattedTeams = hasTeams
      ? teamNames.split(", ").map((name) => `<b>${name}</b>`).join(", ")
      : "";

    const titleText = hasTeams
      ? `Join the Voxora ${formattedTeams} Teams`
      : `Join the Voxora Organization`;

    const bodyText = hasTeams
      ? `<strong>${inviterName}</strong> has invited you to join their ${formattedTeams} Teams as an <strong>${role}</strong>.`
      : `<strong>${inviterName}</strong> has invited you to join their organization as an <strong>${role}</strong>.`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>You're Invited to Join Voxora</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; }
          .button { display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { background: #f9fafb; padding: 20px; text-align: center; color: #6b7280; border-radius: 0 0 8px 8px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 You're Invited!</h1>
            <p>${titleText}</p>
          </div>
          <div class="content">
            <h2>Hello!</h2>
            <p>${bodyText}</p>
            <p>Voxora is a powerful real-time chat support platform that helps teams provide exceptional customer service.</p>
            <p>Click the button below to accept your invitation and set up your account:</p>
            <a href="${inviteUrl}" class="button">Accept Invitation</a>
            <p><strong>Note:</strong> This invitation will expire in 10 minutes.</p>
          </div>
          <div class="footer">
            <p>© 2025 Voxora. All rights reserved.</p>
            <p>If you didn't expect this invitation, you can safely ignore this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to,
      subject: `You're invited to join Voxora as a ${role}`,
      html,
    });
  }

  async sendPasswordResetEmail(
    to: string,
    name: string,
    token: string,
  ): Promise<boolean> {
    const resetUrl = `${config.app.clientUrl}/reset-password?token=${token}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Voxora Password</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; }
          .button { display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { background: #f9fafb; padding: 20px; text-align: center; color: #6b7280; border-radius: 0 0 8px 8px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Password Reset</h1>
            <p>Reset your Voxora password</p>
          </div>
          <div class="content">
            <h2>Hello ${name}!</h2>
            <p>We received a request to reset your password for your Voxora account.</p>
            <p>Click the button below to reset your password:</p>
            <a href="${resetUrl}" class="button">Reset Password</a>
            <p><strong>Note:</strong> This link will expire in 10 minutes for security reasons.</p>
            <p>If you didn't request this password reset, you can safely ignore this email.</p>
          </div>
          <div class="footer">
            <p>© 2024 Voxora. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to,
      subject: "Reset your Voxora password",
      html,
    });
  }

  async sendWelcomeEmail(to: string, name: string, role: string): Promise<boolean> {
    const loginUrl = `${config.app.clientUrl}/auth/login`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Voxora!</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; }
          .button { display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { background: #f9fafb; padding: 20px; text-align: center; color: #6b7280; border-radius: 0 0 8px 8px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Welcome to Voxora!</h1>
            <p>Your account is ready</p>
          </div>
          <div class="content">
            <h2>Hello ${name}!</h2>
            <p>Welcome to Voxora! Your account has been successfully created as a <strong>${role}</strong>.</p>
            <p>You can now access your dashboard and start providing excellent customer support.</p>
            <a href="${loginUrl}" class="button">Login to Dashboard</a>
            <h3>Getting Started:</h3>
            <ul>
              <li>Complete your profile setup</li>
              <li>Familiarize yourself with the chat interface</li>
              <li>Review support guidelines and best practices</li>
              <li>Join your assigned teams</li>
            </ul>
            <p>If you have any questions, don't hesitate to reach out to your team lead or administrator.</p>
          </div>
          <div class="footer">
            <p>© 2024 Voxora. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to,
      subject: "Welcome to Voxora - Your account is ready!",
      html,
    });
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, "");
  }
}

export default new EmailService();
