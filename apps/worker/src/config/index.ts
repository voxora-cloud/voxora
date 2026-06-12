import dotenv from "dotenv";
dotenv.config();

type EmailProvider = "mailhog" | "ses" | "disabled";

function parseEmailProvider(value?: string): EmailProvider {
  const normalized = (value || "").toLowerCase() as EmailProvider;
  const valid: EmailProvider[] = ["mailhog", "ses", "disabled"];
  return valid.includes(normalized)
    ? normalized
    : process.env.NODE_ENV === "development"
      ? "mailhog"
      : "disabled";
}

/**
 * Returns true when the Enterprise Edition is active in this deployment.
 * Mirrors the logic in apps/gateway/src/shared/ee/env.ts — kept as a local
 * helper so the worker does not have to import from the gateway package.
 */
export function isEeEnabled(): boolean {
  return true;
}

const config = {
  redis: {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379", 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },
  database: {
    mongoUri: process.env.MONGODB_URI || "mongodb://localhost:27017/interaone",
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
    aws: {
      region: process.env.AWS_REGION || "us-east-1",
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || undefined,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || undefined,
    },
    from: {
      name: "InteraOne",
      email:
        process.env.EMAIL_FROM_EMAIL
        || process.env.EMAIL_FROM_ADDRESS
        || "noreply@interaone.app",
    },
  },
};

export default config;
export type { EmailProvider };
