import { Queue, ConnectionOptions } from "bullmq";
import config from "./index";

export interface AIJobData {
  conversationId: string;
  content: string;
  messageId: string;
}

const connection: ConnectionOptions = {
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  maxRetriesPerRequest: null,
};

export const aiQueue = new Queue<AIJobData, void, string>("ai-processing", {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 1000 },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});
