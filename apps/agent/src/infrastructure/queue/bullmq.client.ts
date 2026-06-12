import type { ConnectionOptions } from "bullmq";
import config from "../../config";

export function getBullMQConnection(): ConnectionOptions {
  return {
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password,
    maxRetriesPerRequest: null,
  };
}
