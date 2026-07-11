import { Worker } from "bullmq";
import config from "../config";
import { getBullMQConnection } from "../infrastructure/queue/bullmq.client";
import { pubsubRedis } from "../infrastructure/cache/redis.client";
import { suggestReply } from "../modules/assist/suggest-reply.handler";
import { generateNote } from "../modules/assist/generate-note.handler";
import { assistDraft } from "../modules/assist/draft-assist.handler";
import logger from "../utils/logger";

const QUEUE_NAME = "assist-processing";
const PUBSUB_CHANNEL = "assist:response";

export interface AssistJobData {
  action: "suggest-reply" | "generate-note" | "draft-assist";
  requestId: string;
  userId: string;
  organizationId: string;
  conversationId: string;
  payload: {
    messages?: any[];
    contactName?: string;
    draft?: string;
    mode?: "variations" | "reframe";
  };
}

export function startAssistWorker() {
  const connection = getBullMQConnection();

  const worker = new Worker<AssistJobData, void, string>(
    QUEUE_NAME,
    async (job) => {
      const {
        action,
        requestId,
        userId,
        organizationId,
        conversationId,
        payload,
      } = job.data;

      logger.info("Assist job started", {
        jobId: job.id,
        queue: QUEUE_NAME,
        action,
        requestId,
        userId,
        conversationId,
      });

      let result: any = null;

      try {
        switch (action) {
          case "suggest-reply":
            result = await suggestReply({
              conversationId,
              organizationId,
              messages: payload.messages,
            });
            break;
          case "generate-note":
            result = await generateNote({
              conversationId,
              organizationId,
              contactName: payload.contactName,
              messages: payload.messages,
            });
            break;
          case "draft-assist":
            result = await assistDraft({
              conversationId,
              organizationId,
              draft: payload.draft,
              mode: payload.mode,
            });
            break;
          default:
            throw new Error(`Unsupported assist action: ${action}`);
        }

        // Publish success result back to Redis Pub/Sub
        await pubsubRedis.publish(
          PUBSUB_CHANNEL,
          JSON.stringify({
            requestId,
            userId,
            action,
            data: result,
          }),
        );
      } catch (err: any) {
        logger.error("Assist job processing failed", {
          jobId: job.id,
          action,
          requestId,
          error: err.message || err,
        });
        throw err;
      }
    },
    { connection, concurrency: config.worker.concurrency },
  );

  worker.on("completed", (job) =>
    logger.info("Assist job completed", {
      jobId: job.id,
      action: job.data.action,
      requestId: job.data.requestId,
    }),
  );

  worker.on("failed", (job, err) =>
    logger.error("Assist job failed", {
      jobId: job?.id,
      action: job?.data.action,
      requestId: job?.data.requestId,
      error: err,
    }),
  );

  worker.on("error", (err) =>
    logger.error("Assist worker error", { queue: QUEUE_NAME, error: err }),
  );

  logger.info("Assist worker started", {
    queue: QUEUE_NAME,
    concurrency: config.worker.concurrency,
  });

  return worker;
}
