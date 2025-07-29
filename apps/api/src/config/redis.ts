import { createClient } from 'redis';
import config from './index';
import logger from '../utils/logger';

export const redisClient = createClient({
  url: `redis://:${config.redis.password}@${config.redis.host}:${config.redis.port}`,
  socket: {
    reconnectStrategy: (retries) => Math.min(retries * 50, 500)
  }
});

export const redisSubscriber = redisClient.duplicate();
export const redisPublisher = redisClient.duplicate();

export const connectRedis = async (): Promise<void> => {
  try {
    await redisClient.connect();
    await redisSubscriber.connect();
    await redisPublisher.connect();
    
    logger.info('Redis connected successfully');
  } catch (error) {
    logger.error('Redis connection failed:', error);
    throw error;
  }
};

export const disconnectRedis = async (): Promise<void> => {
  try {
    await redisClient.quit();
    await redisSubscriber.quit();
    await redisPublisher.quit();
    logger.info('Redis disconnected');
  } catch (error) {
    logger.error('Error disconnecting from Redis:', error);
  }
};
