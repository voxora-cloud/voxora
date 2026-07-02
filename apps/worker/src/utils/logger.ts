import winston from "winston";

const service = process.env.SERVICE_NAME || "interaone-worker";
const environment = process.env.NODE_ENV || "development";
const isProduction = environment === "production";
const logLevel = process.env.LOG_LEVEL || (isProduction ? "info" : "debug");

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

const serializeMetadata = winston.format((info) => {
  for (const key of Object.keys(info)) {
    info[key] = serialize(info[key]);
  }
  return info;
});

const baseFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  serializeMetadata(),
);

const developmentFormat = winston.format.combine(
  baseFormat,
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
    const metadata = Object.keys(meta).length > 0
      ? ` ${JSON.stringify(meta)}`
      : "";

    return `${timestamp} ${level} [${service}] ${message}${metadata}`;
  }),
);

const productionFormat = winston.format.combine(
  baseFormat,
  winston.format.json(),
);


const logger = winston.createLogger({
  level: logLevel,
  format: productionFormat,
  defaultMeta: { service, environment },
  transports: [
    new winston.transports.Console({
      format: isProduction ? productionFormat : developmentFormat,
    }),
  ],
  exceptionHandlers: [
    new winston.transports.Console({
      format: isProduction ? productionFormat : developmentFormat,
    }),
  ],
  rejectionHandlers: [
    new winston.transports.Console({
      format: isProduction ? productionFormat : developmentFormat,
    }),
  ],
});



export default logger;
