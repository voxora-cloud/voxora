import IORedis from "ioredis";
import config from "./index";
import logger from "../utils/logger";

// ioredis connections — BullMQ requires ioredis, which is incompatible with
// the existing node-redis v4 client. Both point to the same Redis server.

const createConnection = () =>
  new IORedis({
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password || undefined,
    // Required by BullMQ — disables the 'commands blocked' guard so the
    // connection can be reused inside a Queue without throwing.
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });

// Separate connections for Queue and Worker as recommended by BullMQ docs
export const ioRedisQueueClient = createConnection();
export const ioRedisWorkerClient = createConnection();

ioRedisQueueClient.on("connect", () =>
  logger.info("IORedis queue client connected"),
);
ioRedisQueueClient.on("error", (err) =>
  logger.error("IORedis queue client error:", err),
);
