import dotenv from "dotenv";
dotenv.config();

import { startWorker } from "./worker";

console.log("[Voxora AI] Starting AI service...");

const worker = startWorker();

const shutdown = async (signal: string) => {
  console.log(`[Voxora AI] Received ${signal}, shutting down gracefully...`);
  await worker.close();
  process.exit(0);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

process.on("unhandledRejection", (reason) => {
  console.error("[Voxora AI] Unhandled rejection:", reason);
  process.exit(1);
});
