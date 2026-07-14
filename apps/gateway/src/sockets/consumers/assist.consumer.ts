import { redisClient } from "@shared/infra/redis";
import logger from "@shared/core/logger";
import { socketService } from "../services/socket.service";

const ASSIST_PUBSUB_CHANNEL = "assist:response";

export async function startAssistResponseConsumer(): Promise<void> {
  const subscriber = redisClient.duplicate();
  await subscriber.connect();

  await subscriber.subscribe(ASSIST_PUBSUB_CHANNEL, async (message) => {
    try {
      const { requestId, userId, action, data } = JSON.parse(message) as {
        requestId: string;
        userId: string;
        action: "suggest-reply" | "generate-note" | "draft-assist";
        data: any;
      };

      if (!requestId || !userId) {
        logger.warn(
          "[Assist Consumer] Missing requestId or userId in payload",
          {
            message,
          },
        );
        return;
      }

      logger.info("[Assist Consumer] Delivering response", {
        requestId,
        userId,
        action,
      });

      // Send the result to the specific operator via their socket session
      await socketService.emitToUser(userId, "assist:result", {
        requestId,
        action,
        data,
      });
    } catch (error) {
      logger.error(
        "[Assist Consumer] Failed to process assist pubsub message",
        {
          error: error instanceof Error ? error.message : error,
        },
      );
    }
  });

  logger.info(
    "[Assist Consumer] Started subscriber on assist:response channel",
  );
}
