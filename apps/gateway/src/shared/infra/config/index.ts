import dotenv from "dotenv";

dotenv.config();

interface Config {
  app: {
    port: number;
    env: string;
    clientUrl: string;
    mode: "cloud" | "self-host";
    apiUrl: string;
    allowedDomains: string[];
  };
  database: {
    mongoUri: string;
  };
  redis: {
    redisUri?: string;
    host: string;
    port: number;
    password?: string;
  };
  jwt: {
    secret: string;
    expiresIn: string | number;
    refreshSecret: string;
    refreshExpiresIn: string | number;
  };
  email: {
    provider: "mailhog" | "ses" | "resend" | "disabled";
    from: {
      name: string;
      email: string;
    };
  };
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
  cors: {
    allowedOrigins: string[];
  };
  minio: {
    bucketName: string;
    minio_uri: string;
    minio_public_url: string;
    endpoint: string;
    port: number;
    useSSL: boolean;
    accessKey?: string;
    secretKey?: string;
    publicUrl: string;
  };
  aws: {
    region: string;
    accessKeyId?: string;
    secretAccessKey?: string;
  };
}

function parseEmailProvider(value?: string): Config["email"]["provider"] {
  const normalized = (value || "").toLowerCase();
  if (normalized === "mailhog" || normalized === "ses" || normalized === "resend" || normalized === "disabled") {
    return normalized;
  }
  return process.env.NODE_ENV === "development" ? "mailhog" : "disabled";
}

function parseRedisConfig(): Config["redis"] {
  const redisUri = process.env.REDIS_URI;
  if (redisUri) {
    const url = new URL(redisUri);
    return {
      redisUri,
      host: url.hostname,
      port: url.port ? parseInt(url.port, 10) : 6379,
      password: url.password || undefined,
    };
  }

  return {
    redisUri,
    host: process.env.REDIS_HOST!,
    port: parseInt(process.env.REDIS_PORT || "6379", 10),
    password: process.env.REDIS_PASSWORD,
  };
}

function parseMinioConfig(): Config["minio"] {
  const minioUri = process.env.MINIO_URI;
  const minioPublicUrl = process.env.MINIO_PUBLIC_URL || "";

  if (minioUri) {
    const url = new URL(minioUri);
    const useSSL = url.protocol === "https:";
    const port = url.port
      ? parseInt(url.port, 10)
      : useSSL
        ? 443
        : 80;

    return {
      bucketName: process.env.MINIO_BUCKET_NAME!,
      minio_uri: minioUri,
      minio_public_url: minioPublicUrl,
      endpoint: url.hostname,
      port,
      useSSL,
      accessKey: url.username || process.env.MINIO_ACCESS_KEY,
      secretKey: url.password || process.env.MINIO_SECRET_KEY,
      publicUrl: minioPublicUrl,
    };
  }

  return {
    bucketName: process.env.MINIO_BUCKET_NAME!,
    minio_uri: minioUri || "",
    minio_public_url: minioPublicUrl,
    endpoint: process.env.MINIO_ENDPOINT!,
    port: parseInt(process.env.MINIO_PORT || "9000", 10),
    useSSL: process.env.MINIO_USE_SSL === "true",
    accessKey: process.env.MINIO_ACCESS_KEY,
    secretKey: process.env.MINIO_SECRET_KEY,
    publicUrl: minioPublicUrl,
  };
}

const config: Config = {
  app: {
    port: 3002,
    env: process.env.NODE_ENV || "development",
    clientUrl: process.env.CLIENT_URL ||
      (process.env.NODE_ENV === "production"
        ? (() => {
            throw new Error("CLIENT_URL environment variable is required in production");
          })()
        : "http://localhost:5173"),
    mode: (process.env.INTERAONE_MODE || "self-host") === "cloud" ? "cloud" : "self-host",
    apiUrl: process.env.PUBLIC_API_URL || "http://localhost:3002",
    allowedDomains: (process.env.ALLOWED_DOMAINS || process.env.ALLOWED_DOMAIN || "")
      .split(",")
      .map(d => d.trim().toLowerCase())
      .filter(Boolean),
  },
  database: {
    mongoUri: process.env.MONGODB_URI!,
  },
  redis: parseRedisConfig(),
  jwt: {
    secret: process.env.JWT_SECRET!,
    expiresIn: process.env.JWT_EXPIRES_IN!,
    refreshSecret: process.env.JWT_REFRESH_SECRET!,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN!,
  },
  email: {
    provider: parseEmailProvider(process.env.EMAIL_PROVIDER),
    from: {
      name: process.env.EMAIL_FROM_NAME!,
      email: process.env.EMAIL_FROM_EMAIL!,
    },
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000", 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "10000", 10),
  },
  cors: {
    allowedOrigins: ["*"],
  },
  minio: parseMinioConfig(),
  aws: {
    region: process.env.AWS_REGION || "us-east-1",
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
};

export { config };
export default config;
