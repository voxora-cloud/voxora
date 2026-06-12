type LogLevel = "debug" | "info" | "warn" | "error";

type LogMeta = Record<string, unknown>;

const levels: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const service = process.env.SERVICE_NAME || "interaone-agent";
const environment = process.env.NODE_ENV || "development";
const configuredLevel = (process.env.LOG_LEVEL as LogLevel | undefined)
  || (environment === "production" ? "info" : "debug");
const threshold = levels[configuredLevel] ?? levels.info;

function serialize(value: unknown): unknown {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
    };
  }

  if (Array.isArray(value)) {
    return value.map(serialize);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, nested]) => [
        key,
        serialize(nested),
      ]),
    );
  }

  return value;
}

function write(level: LogLevel, message: string, meta: LogMeta = {}) {
  if (levels[level] < threshold) return;

  const payload = {
    timestamp: new Date().toISOString(),
    level,
    service,
    environment,
    message,
    ...(serialize(meta) as LogMeta),
  };

  const line = JSON.stringify(payload);
  if (level === "error") {
    console.error(line);
    return;
  }

  if (level === "warn") {
    console.warn(line);
    return;
  }

  console.log(line);
}

const logger = {
  debug: (message: string, meta?: LogMeta) => write("debug", message, meta),
  info: (message: string, meta?: LogMeta) => write("info", message, meta),
  warn: (message: string, meta?: LogMeta) => write("warn", message, meta),
  error: (message: string, meta?: LogMeta) => write("error", message, meta),
};

export default logger;
