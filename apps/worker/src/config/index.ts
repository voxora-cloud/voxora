import dotenv from "dotenv";
dotenv.config();

type EmailProvider = "smtp" | "mailhog" | "resend" | "sendgrid" | "ses" | "disabled";

function parseEmailProvider(value?: string): EmailProvider {
  const normalized = (value || "").toLowerCase() as EmailProvider;
  const valid: EmailProvider[] = ["smtp", "mailhog", "resend", "sendgrid", "ses", "disabled"];
  return valid.includes(normalized) ? normalized : "mailhog";
}

const config = {
  redis: {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379", 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },
  worker: {
    concurrency: parseInt(process.env.WORKER_CONCURRENCY || "5", 10),
  },
  email: {
    provider: parseEmailProvider(process.env.EMAIL_PROVIDER),
    host: process.env.EMAIL_HOST || "localhost",
    port: parseInt(process.env.EMAIL_PORT || "1025", 10),
    secure: process.env.EMAIL_SECURE === "true",
    auth: {
      user: process.env.EMAIL_USER || undefined,
      pass: process.env.EMAIL_PASS || undefined,
    },
    resendApiKey: process.env.RESEND_API_KEY || undefined,
    sendgridApiKey: process.env.SENDGRID_API_KEY || undefined,
    ses: {
      accessKeyId: process.env.AWS_SES_ACCESS_KEY_ID || undefined,
      secretAccessKey: process.env.AWS_SES_SECRET_ACCESS_KEY || undefined,
      region: process.env.AWS_SES_REGION || "us-east-1",
    },
    from: {
      name: process.env.EMAIL_FROM_NAME || "Voxora",
      email: process.env.EMAIL_FROM_ADDRESS || "noreply@voxora.app",
    },
  },
};

export default config;
export type { EmailProvider };
