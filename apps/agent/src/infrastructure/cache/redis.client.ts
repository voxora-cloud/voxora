import IORedis from "ioredis";
import config from "../../config";

function createRedisClient(): IORedis {
  return new IORedis({
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
}


export const cacheRedis = createRedisClient();
export const pubsubRedis = createRedisClient();
