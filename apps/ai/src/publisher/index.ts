import { pubRedis } from "../config/redis";

const PUBSUB_CHANNEL = "ai:response";
const ESCALATION_CHANNEL = "ai:escalation";
const RESOLUTION_CHANNEL = "ai:resolution";

export interface PublishPayload {
  conversationId: string;
  content: string;
}

export interface EscalationPayload {
  conversationId: string;
  /** The preferred teamId from the original job — may be null if not determined */
  teamId: string | null;
  /** Human-readable reason produced by the LLM */
  reason: string;
}

export interface ResolutionPayload {
  conversationId: string;
  /** Human-readable reason produced by the LLM */
  reason: string;
}

/**
 * Publish the AI response to the Redis Pub/Sub channel.
 * The API's sockets/consumer.ts subscriber picks this up,
 * saves the Message to MongoDB, and emits via Socket.IO.
 */
export async function publishResponse(payload: PublishPayload): Promise<void> {
  await pubRedis.publish(PUBSUB_CHANNEL, JSON.stringify(payload));
}

/**
 * Publish an escalation request to the Redis Pub/Sub channel.
 * The API's sockets/consumer.ts subscriber picks this up, assigns a human
 * agent to the conversation, and emits `conversation_escalated` via Socket.IO.
 */
export async function publishEscalation(payload: EscalationPayload): Promise<void> {
  await pubRedis.publish(ESCALATION_CHANNEL, JSON.stringify(payload));
}

/**
 * Publish a resolution event to the Redis Pub/Sub channel.
 * The API's sockets/consumer.ts subscriber picks this up, marks the
 * conversation as resolved, and emits `status_updated` via Socket.IO.
 */
export async function publishResolution(payload: ResolutionPayload): Promise<void> {
  await pubRedis.publish(RESOLUTION_CHANNEL, JSON.stringify(payload));
}
