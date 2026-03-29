import { EmailTemplate, type EmailTemplateType } from "@shared/models";

export interface EmailTemplateSeed {
  templateKey: string;
  type: EmailTemplateType;
  subjectTemplate: string;
  htmlTemplate: string;
  textTemplate?: string;
}

export const DEFAULT_EMAIL_TEMPLATES: EmailTemplateSeed[] = [
  {
    templateKey: "global.invite",
    type: "invite",
    subjectTemplate: "You're invited to join Voxora as a {{role}}",
    htmlTemplate: `
<!DOCTYPE html>
<html>dcc
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
      <p>{{titleText}}</p>
    </div>
    <div class="content">
      <h2>Hello!</h2>
      <p>{{bodyText}}</p>
      <p>Voxora is a powerful real-time chat support platform that helps teams provide exceptional customer service.</p>
      <p>Click the button below to accept your invitation and set up your account:</p>
      <a href="{{inviteUrl}}" class="button">Accept Invitation</a>
      <p><strong>Note:</strong> This invitation will expire in 7 days.</p>
    </div>
    <div class="footer">
      <p>© 2025 Voxora. All rights reserved.</p>
      <p>If you didn't expect this invitation, you can safely ignore this email.</p>
    </div>
  </div>
</body>
</html>`.trim(),
  },
  {
    templateKey: "global.password_reset",
    type: "password_reset",
    subjectTemplate: "Reset your Voxora password",
    htmlTemplate: `
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
      <h2>Hello {{name}}!</h2>
      <p>We received a request to reset your password for your Voxora account.</p>
      <p>Click the button below to reset your password:</p>
      <a href="{{resetUrl}}" class="button">Reset Password</a>
      <p><strong>Note:</strong> This link will expire in 10 minutes for security reasons.</p>
      <p>If you didn't request this password reset, you can safely ignore this email.</p>
    </div>
    <div class="footer">
      <p>© 2025 Voxora. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`.trim(),
  },
  {
    templateKey: "global.welcome",
    type: "welcome",
    subjectTemplate: "Welcome to Voxora - Your account is ready!",
    htmlTemplate: `
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
      <h2>Hello {{name}}!</h2>
      <p>Welcome to Voxora! Your account has been successfully created as a <strong>{{role}}</strong>.</p>
      <p>You can now access your dashboard and start providing excellent customer support.</p>
      <a href="{{loginUrl}}" class="button">Login to Dashboard</a>
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
</html>`.trim(),
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
        },
        $setOnInsert: {
          subjectTemplate: template.subjectTemplate,
          htmlTemplate: template.htmlTemplate,
          textTemplate: template.textTemplate || "",
          isActive: true,
        },
      },
      upsert: true,
    },
  }));

  const result = await EmailTemplate.bulkWrite(operations, { ordered: true });
  return { inserted: result.upsertedCount || 0 };
}
