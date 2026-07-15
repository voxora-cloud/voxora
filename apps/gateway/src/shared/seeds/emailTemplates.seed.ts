import { EmailTemplate, type EmailTemplateType } from "@shared/models";

export interface EmailTemplateSeed {
  templateKey: string;
  type: EmailTemplateType;
  subjectTemplate: string;
  htmlTemplate: string;
  textTemplate?: string;
}

type EmailLayoutInput = {
  preheader: string;
  eyebrow: string;
  title: string;
  intro: string;
  children: string;
  cta?: {
    href: string;
    label: string;
  };
  note?: string;
  footerNote?: string;
};

const BRAND = {
  name: "InteraOne",
  primary: "#845c6c",
  ink: "#22212a",
  panel: "#342936",
  muted: "#6f6a73",
  soft: "#f7f4f5",
  border: "#e7e1e4",
  card: "#fffdfb",
  success: "#5d9658",
  warning: "#da8620",
  danger: "#b94745",
};

const currentYear = new Date().getFullYear();
const headerLogoUrl = "https://avatars.githubusercontent.com/u/222506196?s=200&v=4";

const logoMarkup = `
<table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
  <tr>
    <td width="44" height="44" style="width:44px;height:44px;">
      <img src="${headerLogoUrl}" width="44" height="44" alt="InteraOne" style="display:block;width:44px;height:44px;border:0;border-radius:11px;outline:none;text-decoration:none;">
    </td>
    <td width="14" style="width:14px;font-size:0;line-height:0;">&nbsp;</td>
    <td style="font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;font-size:20px;line-height:24px;font-weight:700;letter-spacing:-0.02em;color:${BRAND.ink};vertical-align:middle;">InteraOne</td>
  </tr>
</table>`.trim();

const styles = `
body{margin:0;padding:0;background:${BRAND.soft};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}
table{border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;}
img{border:0;outline:none;text-decoration:none;}
a{text-decoration:none;}
.email-shell{width:100%;background:${BRAND.soft};}
.email-container{width:100%;max-width:640px;margin:0 auto;}
.email-pad{padding:28px 20px;}
.brand-row{padding:8px 4px 20px;}
.card{background:${BRAND.card};border:1px solid ${BRAND.border};border-radius:16px;overflow:hidden;box-shadow:0 16px 42px rgba(52,41,54,0.08);}
.hero{background:${BRAND.primary};padding:32px 40px 30px;}
.eyebrow{font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;font-size:12px;line-height:16px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#d8cbd1;margin:0 0 14px;}
.hero-title{font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;font-size:32px;line-height:38px;font-weight:700;letter-spacing:-0.03em;color:#ffffff;margin:0;}
.hero-copy{font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;font-size:16px;line-height:25px;color:#efe8eb;margin:14px 0 0;}
.content{padding:32px 40px 36px;}
.text{font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;font-size:15px;line-height:24px;color:${BRAND.ink};margin:0 0 16px;}
.muted{color:${BRAND.muted};}
.section-title{font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;font-size:15px;line-height:20px;font-weight:700;color:${BRAND.ink};margin:0 0 12px;}
.panel{background:#fbf8f9;border:1px solid ${BRAND.border};border-radius:12px;padding:18px 20px;margin:22px 0;}
.button{display:inline-block;background:${BRAND.primary};border:1px solid ${BRAND.primary};border-radius:8px;color:#ffffff !important;font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;font-size:14px;line-height:18px;font-weight:700;padding:13px 20px;text-align:center;}
.button-row{padding:8px 0 10px;}
.code{font-family:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace;font-size:34px;line-height:42px;font-weight:700;letter-spacing:0.18em;color:${BRAND.ink};background:#ffffff;border:1px solid ${BRAND.border};border-radius:12px;padding:18px 20px;text-align:center;}
.meta{font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;font-size:13px;line-height:20px;color:${BRAND.muted};margin:0;}
.detail-label{font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;font-size:12px;line-height:18px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:${BRAND.muted};padding:0 16px 4px 0;}
.detail-value{font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;font-size:14px;line-height:21px;font-weight:700;color:${BRAND.ink};padding:0 0 4px;}
.divider{height:1px;background:${BRAND.border};line-height:1px;font-size:1px;margin:24px 0;}
.footer{padding:22px 4px 0;text-align:center;font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;font-size:12px;line-height:19px;color:${BRAND.muted};}
.list-item{font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;font-size:14px;line-height:22px;color:${BRAND.ink};padding:0 0 10px;}
.status-pill{display:inline-block;border-radius:999px;padding:6px 10px;background:#f0eaed;color:${BRAND.primary};font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;font-size:12px;line-height:14px;font-weight:700;}
@media only screen and (max-width:640px){
  .email-pad{padding:18px 12px !important;}
  .brand-row{padding:4px 4px 16px !important;}
  .hero{padding:28px 22px 24px !important;}
  .content{padding:26px 22px 30px !important;}
  .hero-title{font-size:26px !important;line-height:32px !important;}
  .hero-copy{font-size:15px !important;line-height:23px !important;}
  .button{display:block !important;width:auto !important;}
  .code{font-size:28px !important;line-height:36px !important;letter-spacing:0.14em !important;}
}
`.trim();

function renderLayout(input: EmailLayoutInput): string {
  const ctaMarkup = input.cta
    ? `
      <table role="presentation" cellpadding="0" cellspacing="0" class="button-row">
        <tr>
          <td>
            <a href="${input.cta.href}" class="button">${input.cta.label}</a>
          </td>
        </tr>
      </table>`
    : "";

  const noteMarkup = input.note
    ? `<div class="panel"><p class="meta">${input.note}</p></div>`
    : "";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>${input.title}</title>
  <style>${styles}</style>
</head>
<body>
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${input.preheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="email-shell">
    <tr>
      <td align="center" class="email-pad">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="email-container">
          <tr>
            <td class="brand-row">${logoMarkup}</td>
          </tr>
          <tr>
            <td class="card">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td class="hero">
                    <p class="eyebrow">${input.eyebrow}</p>
                    <h1 class="hero-title">${input.title}</h1>
                    <p class="hero-copy">${input.intro}</p>
                  </td>
                </tr>
                <tr>
                  <td class="content">
                    ${input.children}
                    ${ctaMarkup}
                    ${noteMarkup}
                    <div class="divider">&nbsp;</div>
                    <p class="meta">${input.footerNote || "This is an automated message from InteraOne. If you were not expecting it, no action is required."}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td class="footer">
              &copy; ${currentYear} InteraOne. Thank you for using InteraOne.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}

function otpBlock(otpColor = BRAND.primary): string {
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0;">
  <tr>
    <td class="code" style="color:${otpColor};">{{otp}}</td>
  </tr>
</table>`.trim();
}

export const DEFAULT_EMAIL_TEMPLATES: EmailTemplateSeed[] = [
  {
    templateKey: "global.email_verification_otp",
    type: "email_verification_otp",
    subjectTemplate: "Your InteraOne email verification code: {{otp}}",
    htmlTemplate: renderLayout({
      preheader: "Confirm your email address to finish setting up your InteraOne account.",
      eyebrow: "Email verification",
      title: "Verify your email address",
      intro: "This action requires verification before you can access your workspace.",
      children: `
        <p class="text">Hello {{name}},</p>
        <p class="text muted">Enter the verification code below in the signup window to confirm your email address.</p>
        ${otpBlock()}
        <p class="meta">This code expires in <strong>2 minutes</strong>. For your security, do not share it with anyone.</p>
      `,
      note: "This verification was requested during registration for an InteraOne account.",
      footerNote: "If you did not create an InteraOne account, no action is required.",
    }),
    textTemplate: "Hello {{name}},\n\nUse {{otp}} to verify your email address for InteraOne. This code expires in 2 minutes. For your security, do not share it with anyone.\n\nIf you did not create an InteraOne account, no action is required.",
  },
  {
    templateKey: "global.password_reset_otp",
    type: "password_reset_otp",
    subjectTemplate: "Your InteraOne password reset code: {{otp}}",
    htmlTemplate: renderLayout({
      preheader: "Use this secure code to reset your InteraOne password.",
      eyebrow: "Password reset",
      title: "Reset your password",
      intro: "This action requires verification before your password can be changed.",
      children: `
        <p class="text">Hello {{name}},</p>
        <p class="text muted">We received a request to reset your InteraOne password. Enter the code below on the password recovery screen to continue.</p>
        ${otpBlock(BRAND.danger)}
        <p class="meta">This code expires in <strong>2 minutes</strong>. Your password will remain unchanged until verification is completed.</p>
      `,
      note: "For security, InteraOne support will never ask you to share this code.",
      footerNote: "If you did not request a password reset, no action is required.",
    }),
    textTemplate: "Hello {{name}},\n\nUse {{otp}} to continue resetting your InteraOne password. This code expires in 2 minutes. InteraOne support will never ask you to share it.\n\nIf you did not request a password reset, no action is required.",
  },
  {
    templateKey: "global.invite",
    type: "invite",
    subjectTemplate: "Invitation to join InteraOne as {{role}}",
    htmlTemplate: renderLayout({
      preheader: "{{inviterName}} invited you to join an InteraOne workspace.",
      eyebrow: "Workspace invitation",
      title: "Join your team on InteraOne",
      intro: "{{titleText}}",
      children: `
        <p class="text">Hello,</p>
        <p class="text muted">{{bodyText}}</p>
        <div class="panel">
          <p class="section-title">What happens next</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td class="list-item">1. Accept the invitation using the secure link below.</td></tr>
            <tr><td class="list-item">2. Confirm your account details.</td></tr>
            <tr><td class="list-item">3. Access your team's InteraOne workspace.</td></tr>
          </table>
        </div>
      `,
      cta: {
        href: "{{inviteUrl}}",
        label: "Accept invitation",
      },
      note: "This invitation expires in 7 days. If the link expires, ask your workspace owner to send a new invitation.",
      footerNote: "If you were not expecting this invitation, no action is required.",
    }),
    textTemplate: "{{inviterName}} invited you to join InteraOne as a {{role}}. Accept the invitation: {{inviteUrl}}",
  },
  {
    templateKey: "global.welcome",
    type: "welcome",
    subjectTemplate: "Welcome to InteraOne — your workspace is ready",
    htmlTemplate: renderLayout({
      preheader: "Your InteraOne workspace is ready.",
      eyebrow: "Welcome",
      title: "Your workspace is ready",
      intro: "Everything is ready for you to start managing customer conversations.",
      children: `
        <p class="text">Hello {{name}},</p>
        <p class="text muted">
          Your account has been set up with <strong>{{role}}</strong> access. Use the steps below to prepare your workspace.
        </p>
        <div class="panel">
          <p class="section-title">Next steps</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td class="list-item">Configure your AI agent and customize your chat widget.</td></tr>
            <tr><td class="list-item">Build your knowledge base with documents, websites, and other trusted content.</td></tr>
            <tr><td class="list-item">Invite human agents and teammates to your workspace.</td></tr>
            <tr><td class="list-item">Connect email, WhatsApp, and Telegram channels.</td></tr>
            <tr><td class="list-item">Monitor conversations, engagement, and performance from your analytics dashboard.</td></tr>
          </table>
        </div>
      `,
      cta: {
        href: "{{loginUrl}}",
        label: "Open workspace",
      },
      footerNote: "You are receiving this email because your InteraOne account was created successfully.",
    }),
    textTemplate:
      "Hello {{name}},\n\nWelcome to InteraOne. Your account is ready with {{role}} access. Configure your AI agent, build your knowledge base, invite teammates, connect your channels, and review performance from the analytics dashboard.\n\nOpen your workspace: {{loginUrl}}",
  },
  {
    templateKey: "global.notification",
    type: "notification",
    subjectTemplate: "{{title}}",
    htmlTemplate: renderLayout({
      preheader: "{{message}}",
      eyebrow: "Workspace notification",
      title: "{{title}}",
      intro: "There is a new update in your InteraOne workspace.",
      children: `
        <p class="text">Hello {{name}},</p>
        <p class="text muted">{{message}}</p>
        <div class="panel">
          <span class="status-pill">{{status}}</span>
          <p class="meta" style="margin-top:12px;">Review the latest details in InteraOne and take action if needed.</p>
        </div>
      `,
      cta: {
        href: "{{actionUrl}}",
        label: "{{actionLabel}}",
      },
      footerNote: "You are receiving this because notifications are enabled for your InteraOne workspace.",
    }),
    textTemplate: "{{title}}\n\n{{message}}\n\n{{actionLabel}}: {{actionUrl}}",
  },
  {
    templateKey: "global.alert",
    type: "alert",
    subjectTemplate: "Action recommended: {{title}} | InteraOne",
    htmlTemplate: renderLayout({
      preheader: "{{message}}",
      eyebrow: "Workspace alert",
      title: "{{title}}",
      intro: "An item in your workspace may require your attention.",
      children: `
        <p class="text">Hello {{name}},</p>
        <p class="text muted">{{message}}</p>
        <div class="panel" style="border-color:#ead3d2;background:#fff8f7;">
          <p class="section-title" style="color:${BRAND.danger};">Recommended action</p>
          <p class="meta">{{recommendation}}</p>
        </div>
      `,
      cta: {
        href: "{{actionUrl}}",
        label: "{{actionLabel}}",
      },
      footerNote: "You are receiving this alert because you are listed as a workspace admin or owner.",
    }),
    textTemplate: "Action recommended: {{title}}\n\n{{message}}\n\nRecommended action: {{recommendation}}\n\n{{actionLabel}}: {{actionUrl}}",
  },
  {
    templateKey: "global.agent_verification_otp",
    type: "agent_verification_otp",
    subjectTemplate: "Your InteraOne support verification code: {{otp}}",
    htmlTemplate: renderLayout({
      preheader: "Use this secure code to verify your identity with InteraOne support.",
      eyebrow: "Identity verification",
      title: "Verify your identity",
      intro: "This action requires verification before support can continue with your request.",
      children: `
        <p class="text">Hello,</p>
        <p class="text muted">Enter the verification code below during the active support conversation to securely confirm your identity.</p>
        ${otpBlock()}
        <p class="meta">This code expires in <strong>10 minutes</strong>. For your security, use it only during the active verification step.</p>
      `,
      footerNote: "If you did not request support verification, no action is required.",
    }),
    textTemplate: "Hello,\n\nUse {{otp}} to verify your identity during your active InteraOne support conversation. This code expires in 10 minutes.\n\nIf you did not request support verification, no action is required.",
  },
  {
    templateKey: "global.conversation_summary",
    type: "conversation_summary",
    subjectTemplate: "Your conversation summary from {{companyName}}",
    htmlTemplate: renderLayout({
      preheader: "A concise summary of your recent support conversation.",
      eyebrow: "Conversation summary",
      title: "Your conversation summary",
      intro: "Here is a summary of your recent conversation with {{companyName}}.",
      children: `
        <p class="text">Hello {{name}},</p>
        <p class="text muted">For your reference, the key details from your conversation are included below.</p>
        <div class="panel" style="background:#fcfafb;">
          <p class="text" style="white-space:pre-wrap;margin-bottom:0;">{{summary}}</p>
        </div>
        <p class="meta">If you need further assistance, reply to this email or start a new conversation on our website.</p>
      `,
      footerNote: "Thank you for contacting {{companyName}} through InteraOne.",
    }),
    textTemplate: "Hello {{name}},\n\nHere is a summary of your recent conversation with {{companyName}}:\n\n{{summary}}\n\nIf you need further assistance, reply to this email or start a new conversation.",
  },
  {
    templateKey: "global.ticket_created",
    type: "ticket_created",
    subjectTemplate: "Support request {{ticketNumber}} received",
    htmlTemplate: renderLayout({
      preheader: "Your support request has been received.",
      eyebrow: "Support request received",
      title: "Your request has been received",
      intro: "Your support request is now recorded and ready for review.",
      children: `
        <p class="text">Hello {{name}},</p>
        <p class="text muted">Thank you for contacting support. Keep the reference number below for future correspondence.</p>
        <div class="panel">
          <p class="section-title">{{ticketNumber}} — {{title}}</p>
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr><td class="detail-label">Status</td><td class="detail-value">{{status}}</td></tr>
            <tr><td class="detail-label">Priority</td><td class="detail-value">{{priority}}</td></tr>
          </table>
        </div>
      `,
      footerNote: "We will notify you when there is an update to this support request.",
    }),
    textTemplate: "Hello {{name}},\n\nYour support request has been received.\n\nReference: {{ticketNumber}}\nSubject: {{title}}\nStatus: {{status}}\nPriority: {{priority}}\n\nWe will notify you when there is an update.",
  },
  {
    templateKey: "global.ticket_updated",
    type: "ticket_updated",
    subjectTemplate: "Support request {{ticketNumber}} has been updated",
    htmlTemplate: renderLayout({
      preheader: "New information is available for your support request.",
      eyebrow: "Support request update",
      title: "Your support request has been updated",
      intro: "New information is available for your support request.",
      children: `
        <p class="text">Hello {{name}},</p>
        <div class="panel">
          <p class="section-title">{{ticketNumber}} — {{title}}</p>
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr><td class="detail-label">Status</td><td class="detail-value">{{status}}</td></tr>
            <tr><td class="detail-label">Priority</td><td class="detail-value">{{priority}}</td></tr>
          </table>
        </div>
        <p class="section-title">Latest update</p>
        <p class="text muted">{{updateSummary}}</p>
      `,
      footerNote: "Thank you for your patience while this support request is being handled.",
    }),
    textTemplate: "Hello {{name}},\n\nYour support request {{ticketNumber}} ({{title}}) has been updated.\n\nStatus: {{status}}\nPriority: {{priority}}\n\nLatest update:\n{{updateSummary}}",
  },
  {
    templateKey: "global.ticket_resolved",
    type: "ticket_resolved",
    subjectTemplate: "Support request {{ticketNumber}} has been resolved",
    htmlTemplate: renderLayout({
      preheader: "Your support request has been resolved.",
      eyebrow: "Support request resolved",
      title: "Your support request is resolved",
      intro: "The support team has marked this request as resolved.",
      children: `
        <p class="text">Hello {{name}},</p>
        <div class="panel">
          <p class="section-title">{{ticketNumber}} — {{title}}</p>
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr><td class="detail-label">Status</td><td class="detail-value">{{status}}</td></tr>
          </table>
        </div>
        <p class="section-title">Resolution details</p>
        <p class="text muted">{{resolutionNote}}</p>
      `,
      footerNote: "If you still need assistance, reply to the support team or start a new conversation.",
    }),
    textTemplate: "Hello {{name}},\n\nYour support request {{ticketNumber}} ({{title}}) has been resolved.\n\nResolution details:\n{{resolutionNote}}\n\nIf you still need assistance, reply to the support team or start a new conversation.",
  },
  {
    templateKey: "global.ticket_closed",
    type: "ticket_closed",
    subjectTemplate: "Support request {{ticketNumber}} is now closed",
    htmlTemplate: renderLayout({
      preheader: "Your support request is now closed.",
      eyebrow: "Support request closed",
      title: "Your support request is closed",
      intro: "The support team has closed this request.",
      children: `
        <p class="text">Hello {{name}},</p>
        <div class="panel">
          <p class="section-title">{{ticketNumber}} — {{title}}</p>
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr><td class="detail-label">Status</td><td class="detail-value">{{status}}</td></tr>
          </table>
        </div>
        <p class="section-title">Closure details</p>
        <p class="text muted">{{resolutionNote}}</p>
      `,
      footerNote: "If you need further assistance, start a new support conversation.",
    }),
    textTemplate: "Hello {{name}},\n\nYour support request {{ticketNumber}} ({{title}}) is now closed.\n\nClosure details:\n{{resolutionNote}}\n\nIf you need further assistance, start a new support conversation.",
  },
  {
    templateKey: "global.domain_verification_pending",
    type: "domain_verification_pending",
    subjectTemplate: "Action required: verify {{domain}} for InteraOne",
    htmlTemplate: renderLayout({
      preheader: "Verify your domain ownership for InteraOne widget security.",
      eyebrow: "Domain security",
      title: "Verify your domain",
      intro: "Complete DNS verification to secure your InteraOne widget on {{domain}}.",
      children: `
        <p class="text">Hello {{name}},</p>
        <p class="text muted">To confirm ownership of <strong>{{domain}}</strong> and protect your chat widget, add the following DNS TXT record:</p>
        <div class="panel">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td class="detail-label">Record type</td><td class="detail-value">TXT</td></tr>
            <tr><td class="detail-label">Host / name</td><td class="detail-value">{{domain}}</td></tr>
            <tr><td class="detail-label">Value / target</td><td class="detail-value"><code style="background:rgba(0,0,0,0.05);padding:2px 6px;border-radius:4px;">{{token}}</code></td></tr>
          </table>
        </div>
        <p class="text muted">After adding the record, select <strong>Verify domain</strong> in your InteraOne widget settings. DNS changes can take up to 24 hours to become available.</p>
      `,
      cta: {
        href: "{{settingsUrl}}",
        label: "Open widget settings",
      },
      footerNote: "You are receiving this because you configured a verified domain for your InteraOne widget.",
    }),
    textTemplate: "Hello {{name}},\n\nTo confirm ownership of {{domain}} and protect your chat widget, add the following DNS TXT record:\n\nRecord type: TXT\nHost / name: {{domain}}\nValue / target: {{token}}\n\nAfter adding the record, open your widget settings and select Verify domain: {{settingsUrl}}",
  },
  {
    templateKey: "global.domain_verification_completed",
    type: "domain_verification_completed",
    subjectTemplate: "{{domain}} has been verified for InteraOne",
    htmlTemplate: renderLayout({
      preheader: "Your domain verification is complete.",
      eyebrow: "Domain security",
      title: "Your domain is verified",
      intro: "Ownership of {{domain}} has been confirmed.",
      children: `
        <p class="text">Hello {{name}},</p>
        <p class="text muted">Your domain <strong>{{domain}}</strong> is verified and its widget security settings are now active.</p>
        <div class="panel" style="border-color:#d5ead2;background:#f5fbf4;">
          <p class="section-title" style="color:${BRAND.success};">Protection enabled</p>
          <p class="meta">Your chat widget is restricted to this verified domain. Other websites cannot embed it using your public key.</p>
        </div>
      `,
      cta: {
        href: "{{settingsUrl}}",
        label: "Manage domain settings",
      },
      footerNote: "You are receiving this because you are an admin or owner of this InteraOne workspace.",
    }),
    textTemplate: "Hello {{name}},\n\nYour domain {{domain}} has been verified. Your chat widget is now restricted to this domain, and other websites cannot embed it using your public key.\n\nManage domain settings: {{settingsUrl}}",
  },
  {
    templateKey: "global.free_credit_granted",
    type: "free_credit_granted",
    subjectTemplate: "Your free monthly credits are ready — InteraOne",
    htmlTemplate: renderLayout({
      preheader: "Your InteraOne free plan is active and {{creditAmount}} are ready to use.",
      eyebrow: "Free plan activated",
      title: "Your free credits are ready",
      intro: "Welcome to InteraOne. Your workspace is live and your free monthly credits have been added.",
      children: `
        <p class="text">Hello {{name}},</p>
        <p class="text muted">
          Your account is on the <strong>Free plan</strong>. You have been credited
          <strong>{{creditAmount}}</strong> for this billing period.
        </p>
        <div class="panel" style="border-color:#d5ead2;background:#f5fbf4;">
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr><td class="detail-label">Credits this month</td><td class="detail-value">{{creditAmount}}</td></tr>
            <tr><td class="detail-label">Resets on</td><td class="detail-value">{{resetDate}}</td></tr>
          </table>
        </div>
        <p class="text muted">
          Need more messages or advanced features? Upgrade to a paid plan anytime from your billing settings.
        </p>
      `,
      cta: {
        href: "{{dashboardUrl}}",
        label: "Open dashboard",
      },
      footerNote: "You are receiving this because a free InteraOne workspace was created for your account.",
    }),
    textTemplate: "Hello {{name}},\n\nYour InteraOne Free plan is active. You have been credited {{creditAmount}} for this billing period (resets on {{resetDate}}).\n\nNeed more? Upgrade from your billing settings.\n\nOpen dashboard: {{dashboardUrl}}",
  },
  {
    templateKey: "global.usage_threshold_warning",
    type: "usage_threshold_warning",
    subjectTemplate: "Heads up: you've used {{pct}}% of your InteraOne message quota",
    htmlTemplate: renderLayout({
      preheader: "You've used {{pct}}% of your monthly message quota — {{used}} of {{limit}} messages.",
      eyebrow: "Usage alert",
      title: "You're at {{pct}}% of your quota",
      intro: "Your workspace is approaching its monthly message limit.",
      children: `
        <p class="text">Hello {{name}},</p>
        <p class="text muted">
          Your workspace has used <strong>{{used}} of {{limit}} AI messages</strong> ({{pct}}%) this billing period.
          At this rate you may exhaust your quota before the period resets.
        </p>
        <div class="panel" style="border-color:#f5ddb3;background:#fffcf5;">
          <p class="section-title" style="color:${BRAND.warning};">Usage summary</p>
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr><td class="detail-label">Messages used</td><td class="detail-value">{{used}} / {{limit}}</td></tr>
            <tr><td class="detail-label">Usage</td><td class="detail-value">{{pct}}%</td></tr>
            <tr><td class="detail-label">Period resets</td><td class="detail-value">{{resetDate}}</td></tr>
          </table>
        </div>
        <p class="text muted">
          Upgrade to a higher plan to avoid service interruption and get unlimited or expanded message quotas.
        </p>
      `,
      cta: {
        href: "{{upgradeUrl}}",
        label: "View upgrade options",
      },
      footerNote: "You are receiving this alert because you are the owner of this InteraOne workspace.",
    }),
    textTemplate: "Hello {{name}},\n\nYour workspace has used {{used}} of {{limit}} AI messages ({{pct}}%) this billing period.\n\nPeriod resets: {{resetDate}}\n\nUpgrade to avoid interruption: {{upgradeUrl}}",
  },
  {
    templateKey: "global.usage_exhausted",
    type: "usage_exhausted",
    subjectTemplate: "Action required: your InteraOne message quota is exhausted",
    htmlTemplate: renderLayout({
      preheader: "Your workspace has used all {{limit}} messages for this billing period.",
      eyebrow: "Quota exhausted",
      title: "Your message quota is used up",
      intro: "Your workspace has reached its monthly message limit and the AI assistant is currently paused.",
      children: `
        <p class="text">Hello {{name}},</p>
        <p class="text muted">
          Your workspace has consumed all <strong>{{limit}} AI messages</strong> for this billing period.
          The AI assistant will resume automatically when the quota resets on <strong>{{resetDate}}</strong>.
        </p>
        <div class="panel" style="border-color:#ead3d2;background:#fff8f7;">
          <p class="section-title" style="color:${BRAND.danger};">Quota exceeded</p>
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr><td class="detail-label">Messages used</td><td class="detail-value">{{used}} / {{limit}}</td></tr>
            <tr><td class="detail-label">Quota resets</td><td class="detail-value">{{resetDate}}</td></tr>
          </table>
        </div>
        <p class="text muted">
          Upgrade now to restore AI responses immediately and prevent this from happening next month.
        </p>
      `,
      cta: {
        href: "{{upgradeUrl}}",
        label: "Upgrade plan",
      },
      footerNote: "You are receiving this because you are the owner of this InteraOne workspace.",
    }),
    textTemplate: "Hello {{name}},\n\nYour workspace has used all {{limit}} AI messages for this billing period. The AI assistant is paused until the quota resets on {{resetDate}}.\n\nUpgrade now to restore immediately: {{upgradeUrl}}",
  },
  {
    templateKey: "global.subscription_activated",
    type: "subscription_activated",
    subjectTemplate: "Your InteraOne {{planName}} plan is now active",
    htmlTemplate: renderLayout({
      preheader: "Your InteraOne {{planName}} subscription is confirmed and active.",
      eyebrow: "Subscription confirmed",
      title: "Your {{planName}} plan is active",
      intro: "Thank you for subscribing. Your workspace has been upgraded and all plan features are now available.",
      children: `
        <p class="text">Hello {{name}},</p>
        <p class="text muted">
          Your <strong>{{planName}}</strong> subscription is active. All plan features and increased limits are
          now available in your workspace.
        </p>
        <div class="panel" style="border-color:#d5ead2;background:#f5fbf4;">
          <p class="section-title" style="color:${BRAND.success};">Subscription details</p>
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr><td class="detail-label">Plan</td><td class="detail-value">{{planName}}</td></tr>
            <tr><td class="detail-label">Next billing date</td><td class="detail-value">{{nextBillingDate}}</td></tr>
          </table>
        </div>
        <p class="text muted">
          Manage your subscription, invoices, and payment details from the billing settings at any time.
        </p>
      `,
      cta: {
        href: "{{dashboardUrl}}",
        label: "Open dashboard",
      },
      footerNote: "You are receiving this because you activated or renewed an InteraOne subscription.",
    }),
    textTemplate: "Hello {{name}},\n\nYour InteraOne {{planName}} plan is now active.\n\nNext billing date: {{nextBillingDate}}\n\nManage billing: {{dashboardUrl}}",
  },
  {
    templateKey: "global.channel_verified",
    type: "channel_verified",
    subjectTemplate: "{{channelType}} channel connected — InteraOne",
    htmlTemplate: renderLayout({
      preheader: "Your {{channelType}} channel \"{{channelName}}\" is now connected and receiving messages.",
      eyebrow: "Channel connected",
      title: "{{channelType}} is connected",
      intro: "Your channel has been verified and is now live.",
      children: `
        <p class="text">Hello {{name}},</p>
        <p class="text muted">
          Your <strong>{{channelType}}</strong> channel has been successfully connected to InteraOne.
          Incoming messages from this channel will now route through your AI assistant and inbox.
        </p>
        <div class="panel" style="border-color:#d5ead2;background:#f5fbf4;">
          <p class="section-title" style="color:${BRAND.success};">Channel details</p>
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr><td class="detail-label">Type</td><td class="detail-value">{{channelType}}</td></tr>
            <tr><td class="detail-label">Name</td><td class="detail-value">{{channelName}}</td></tr>
            <tr><td class="detail-label">Status</td><td class="detail-value">Active</td></tr>
          </table>
        </div>
      `,
      cta: {
        href: "{{dashboardUrl}}",
        label: "View channels",
      },
      footerNote: "You are receiving this because you are the owner of this InteraOne workspace.",
    }),
    textTemplate: "Hello {{name}},\n\nYour {{channelType}} channel \"{{channelName}}\" has been connected to InteraOne. Incoming messages will now route through your AI assistant and inbox.\n\nView channels: {{dashboardUrl}}",
  },
];

export async function seedEmailTemplates(): Promise<{
  inserted: number;
}> {
  const operations = DEFAULT_EMAIL_TEMPLATES.map((template) => ({
    updateOne: {
      // Match by templateKey first, but also by legacy type-only records so
      // startup seeding can backfill templateKey without creating duplicates.
      filter: {
        $or: [{ templateKey: template.templateKey }, { type: template.type }],
      },
      update: {
        $set: {
          templateKey: template.templateKey,
          type: template.type,
          subjectTemplate: template.subjectTemplate,
          htmlTemplate: template.htmlTemplate,
          textTemplate: template.textTemplate || "",
        },
        $setOnInsert: {
          isActive: true,
        },
      },
      upsert: true,
    },
  }));

  const result = await EmailTemplate.bulkWrite(operations, { ordered: true });
  return { inserted: result.upsertedCount || 0 };
}
