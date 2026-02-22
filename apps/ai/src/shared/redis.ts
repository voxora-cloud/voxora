import IORedis from "ioredis";

// Live Redis connection for Pub/Sub — shared across modules.
// BullMQ manages its own separate connections internally.
export const pubRedis = new IORedis({
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379", 10),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});
