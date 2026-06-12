import dotenv from "dotenv";
dotenv.config();

import { startWorker } from "./workers/reply.worker";
import { startIngestionWorker } from "./workers/ingestion.worker";
import { startHealthServer } from "./health/health.server";
import logger from "./utils/logger";

logger.info("Starting AI service", {
  nodeEnv: process.env.NODE_ENV || "development",
});

const chatWorker = startWorker();
const ingestionWorker = startIngestionWorker();
const healthServer = startHealthServer();

const shutdown = async (signal: string) => {
  logger.info("Received shutdown signal", { signal });
  await Promise.all([
    chatWorker.close(),
    ingestionWorker.close(),
    new Promise<void>((resolve) => healthServer.close(() => resolve())),
  ]);
  logger.info("AI service shutdown completed", { signal });
  process.exit(0);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled promise rejection", { reason });
  process.exit(1);
});

process.on("uncaughtException", (error) => {
  logger.error("Uncaught exception", { error });
  process.exit(1);
});
