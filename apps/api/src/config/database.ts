import mongoose from 'mongoose';
import config from './index';
import logger from '../utils/logger';

export const connectDatabase = async (): Promise<void> => {
  try {
    const connection = await mongoose.connect(config.database.mongoUri);
    logger.info(`MongoDB connected: ${connection.connection.host}`);
  } catch (error) {
    logger.error('Database connection failed:', error);
    process.exit(1);
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    logger.info('MongoDB disconnected');
  } catch (error) {
    logger.error('Error disconnecting from database:', error);
  }
};
