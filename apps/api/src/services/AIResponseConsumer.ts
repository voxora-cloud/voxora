import { redisClient } from "../config/redis";
import { Message } from "../models";
import logger from "../utils/logger";
import type SocketManager from "../sockets";

const PUBSUB_CHANNEL = "ai:response";

export async function startAIResponseConsumer(
  socketManager: SocketManager,
): Promise<void> {
  // Dedicated subscriber — a subscribed node-redis client cannot run other commands
  const subscriber = redisClient.duplicate();
  await subscriber.connect();

  await subscriber.subscribe(PUBSUB_CHANNEL, async (message) => {
    try {
      const { conversationId, content } = JSON.parse(message) as {
        conversationId: string;
        content: string;
      };

      const msg = new Message({
        conversationId,
        senderId: "ai-bot",
        content,
        type: "text",
        metadata: {
          senderName: "AI Assistant",
          senderEmail: "ai@voxora.internal",
          source: "ai",
        },
      });

      await msg.save();

      socketManager.emitToConversation(conversationId, "new_message", {
        conversationId,
        message: {
          _id: msg._id,
          senderId: msg.senderId,
          content: msg.content,
          type: msg.type,
          metadata: msg.metadata,
          createdAt: msg.createdAt,
        },
      });

      logger.info(`AI response delivered to conversation ${conversationId}`);
    } catch (err) {
      logger.error("Failed to handle AI response:", err);
    }
  });

  logger.info("AI response subscriber ready");
}

