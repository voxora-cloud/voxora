import config from "@shared/config";
import {
  EmailTemplate,
  type EmailTemplateType,
} from "@shared/models";
import { DEFAULT_EMAIL_TEMPLATES } from "@shared/seeds/emailTemplates.seed";

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: {
    name: string;
    email: string;
  };
}

export interface BuiltEmail {
  subject: string;
  html: string;
  text?: string;
}

type TemplateVars = Record<string, string>;

const DEFAULT_TEMPLATES = DEFAULT_EMAIL_TEMPLATES.reduce(
  (acc, template) => {
    acc[template.type] = {
      subjectTemplate: template.subjectTemplate,
      htmlTemplate: template.htmlTemplate,
      textTemplate: template.textTemplate,
    };
    return acc;
  },
  {} as Record<EmailTemplateType, { subjectTemplate: string; htmlTemplate: string; textTemplate?: string }>,
);

/**
 * Returns true when EMAIL_PROVIDER is set to a real provider.
 * Used by callers to decide whether to enqueue an email job at all.
 */
export function isEmailEnabled(): boolean {
  return config.email.provider === "resend" || config.email.provider === "mailhog";
}

function renderTemplate(template: string, vars: TemplateVars): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => {
    return vars[key] ?? "";
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function getTemplate(type: EmailTemplateType): Promise<{
  subjectTemplate: string;
  htmlTemplate: string;
  textTemplate?: string;
}> {
  const template = await EmailTemplate.findOne({ type, isActive: true })
    .select("subjectTemplate htmlTemplate textTemplate")
    .lean();

  if (template) {
    return {
      subjectTemplate: template.subjectTemplate,
      htmlTemplate: template.htmlTemplate,
      textTemplate: template.textTemplate,
    };
  }

  return DEFAULT_TEMPLATES[type];
}

async function buildFromTemplate(type: EmailTemplateType, vars: TemplateVars): Promise<BuiltEmail> {
  try {
    const template = await getTemplate(type);

    return {
      subject: renderTemplate(template.subjectTemplate, vars),
      html: renderTemplate(template.htmlTemplate, vars),
      text: template.textTemplate ? renderTemplate(template.textTemplate, vars) : undefined,
    };
  } catch {
    // Database read/write failed; keep mail flow working with in-memory defaults.
    const defaults = DEFAULT_TEMPLATES[type];
    return {
      subject: renderTemplate(defaults.subjectTemplate, vars),
      html: renderTemplate(defaults.htmlTemplate, vars),
      text: defaults.textTemplate ? renderTemplate(defaults.textTemplate, vars) : undefined,
    };
  }
}

// ── Template builders ────────────────────────────────────────────────────────

export async function buildInviteEmail(
  inviterName: string,
  role: string,
  inviteToken: string,
  teamNames: string,
): Promise<BuiltEmail> {
  const inviteUrl = `${config.app.clientUrl}/auth/accept-invite?token=${inviteToken}`;

  const safeInviterName = escapeHtml(inviterName);
  const safeRole = escapeHtml(role);
  const hasTeams = teamNames && teamNames.trim().length > 0;
  const formattedTeams = hasTeams
    ? teamNames
        .split(",")
        .map((name) => name.trim())
        .filter(Boolean)
        .map((name) => `<b>${escapeHtml(name)}</b>`)
        .join(", ")
    : "";

  const titleText = hasTeams
    ? `Join the Voxora ${formattedTeams} Teams`
    : "Join the Voxora Organization";

  const bodyText = hasTeams
    ? `<strong>${safeInviterName}</strong> has invited you to join their ${formattedTeams} Teams as an <strong>${safeRole}</strong>.`
    : `<strong>${safeInviterName}</strong> has invited you to join their organization as an <strong>${safeRole}</strong>.`;

  return buildFromTemplate("invite", {
    inviterName: safeInviterName,
    role: safeRole,
    inviteUrl,
    titleText,
    bodyText,
    teamNames: hasTeams ? formattedTeams : "",
  });
}

export async function buildPasswordResetEmail(
  name: string,
  resetToken: string,
): Promise<BuiltEmail> {
  const resetUrl = `${config.app.clientUrl}/auth/reset-password?token=${resetToken}`;

  return buildFromTemplate("password_reset", {
    name: escapeHtml(name),
    resetUrl,
  });
}

export async function buildWelcomeEmail(name: string, role: string): Promise<BuiltEmail> {
  const loginUrl = `${config.app.clientUrl}/auth/login`;

  return buildFromTemplate("welcome", {
    name: escapeHtml(name),
    role: escapeHtml(role),
    loginUrl,
  });
}
