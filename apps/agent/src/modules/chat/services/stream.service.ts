import { cacheRedis } from "../../../infrastructure/cache/redis.client";
import { publishStreamChunk } from "../../../infrastructure/queue/reply.queue";

const STREAM_SEQ_TTL_SECONDS = parseInt(
  process.env.AI_STREAM_SEQ_TTL_SECONDS || "300",
  10,
);

export async function publishStreamWithSeq(params: {
  conversationId: string;
  messageId?: string;
  chunk: string;
  isThought?: boolean;
}): Promise<void> {
  const { conversationId, messageId, chunk, isThought = false } = params;
  const key = messageId
    ? `ai:stream:seq:${conversationId}:${messageId}`
    : `ai:stream:seq:${conversationId}`;

  const seq = await cacheRedis.incr(key);
  if (seq === 1) {
    await cacheRedis.expire(key, STREAM_SEQ_TTL_SECONDS);
  }

  await publishStreamChunk({ conversationId, chunk, isThought, seq, messageId });
}
