import dotenv from "dotenv";
dotenv.config();

import { startEmailWorker } from "./workers/email.worker";
import { startAnalyticsWorker } from "./workers/analytics.worker";

console.log("[Voxora Worker] Starting platform worker service...");

const emailWorker = startEmailWorker();
const analyticsWorker = startAnalyticsWorker();

const shutdown = async (signal: string) => {
  console.log(`[Voxora Worker] Received ${signal}, shutting down gracefully...`);
  await Promise.all([emailWorker.close(), analyticsWorker.close()]);
  process.exit(0);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

process.on("unhandledRejection", (reason) => {
  console.error("[Voxora Worker] Unhandled rejection:", reason);
  process.exit(1);
});
