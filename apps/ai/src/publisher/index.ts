import { pubRedis } from "../config/redis";

const PUBSUB_CHANNEL = "ai:response";

export interface PublishPayload {
  conversationId: string;
  content: string;
}

/**
 * Publish the AI response to the Redis Pub/Sub channel.
 * The API's sockets/consumer.ts subscriber picks this up,
 * saves the Message to MongoDB, and emits via Socket.IO.
 */
export async function publishResponse(payload: PublishPayload): Promise<void> {
  await pubRedis.publish(PUBSUB_CHANNEL, JSON.stringify(payload));
}
