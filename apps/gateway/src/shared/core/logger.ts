import winston from "winston";
import config from "@shared/infra/config";

const service = process.env.SERVICE_NAME || "interaone-gateway";
const environment = config.app.env || process.env.NODE_ENV || "development";
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

const operationalOnly = winston.format((info) => {
	return ["debug", "info"].includes(info.level) ? info : false;
});

const issueOnly = winston.format((info) => {
	return ["warn", "error"].includes(info.level) ? info : false;
});


const logger = winston.createLogger({
	level: logLevel,
	format: productionFormat,
	defaultMeta: { service, environment },
	transports: [
		new winston.transports.File({
			filename: "logs/error.log",
			level: "warn",
			format: winston.format.combine(issueOnly(), productionFormat),
		}),
		new winston.transports.File({
			filename: "logs/combined.log",
			format: winston.format.combine(operationalOnly(), productionFormat),
		}),
		new winston.transports.Console({
			format: isProduction ? productionFormat : developmentFormat,
		}),
	],
	...(isProduction
		? {
				exceptionHandlers: [
					new winston.transports.Console({
						format: productionFormat,
					}),
				],
				rejectionHandlers: [
					new winston.transports.Console({
						format: productionFormat,
					}),
				],
			}
		: {}),
});



export default logger;
