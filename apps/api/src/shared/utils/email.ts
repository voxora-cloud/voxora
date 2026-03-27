import config from "@shared/config";

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface BuiltEmail {
  subject: string;
  html: string;
}

/**
 * Returns true when EMAIL_PROVIDER is set to a real provider.
 * Used by callers to decide whether to enqueue an email job at all.
 */
export function isEmailEnabled(): boolean {
  return config.email.provider !== ("disabled" as string);
}

// ── Template builders ────────────────────────────────────────────────────────

export function buildInviteEmail(
  inviterName: string,
  role: string,
  inviteToken: string,
  teamNames: string,
): BuiltEmail {
  const inviteUrl = `${config.app.clientUrl}/auth/accept-invite?token=${inviteToken}`;

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
          <p><strong>Note:</strong> This invitation will expire in 7 days.</p>
        </div>
        <div class="footer">
          <p>© 2025 Voxora. All rights reserved.</p>
          <p>If you didn't expect this invitation, you can safely ignore this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return { subject: `You're invited to join Voxora as a ${role}`, html };
}

export function buildPasswordResetEmail(name: string, resetToken: string): BuiltEmail {
  const resetUrl = `${config.app.clientUrl}/auth/reset-password?token=${resetToken}`;

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
          <p>© 2025 Voxora. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return { subject: "Reset your Voxora password", html };
}

export function buildWelcomeEmail(name: string, role: string): BuiltEmail {
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
          <p>© 2025 Voxora. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return { subject: "Welcome to Voxora - Your account is ready!", html };
}

