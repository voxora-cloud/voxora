import { cacheRedis } from "../../../infrastructure/cache/redis.client";
import { publishStreamChunk, ToolEventData } from "../../../infrastructure/queue/reply.queue";

const STREAM_SEQ_TTL_SECONDS = parseInt(
  process.env.AI_STREAM_SEQ_TTL_SECONDS || "300",
  10,
);

const pendingStreams = new Map<string, Promise<void>>();

function getStreamKey(conversationId: string, messageId?: string): string {
  return messageId
    ? `ai:stream:seq:${conversationId}:${messageId}`
    : `ai:stream:seq:${conversationId}`;
}

export async function publishStreamWithSeq(params: {
  conversationId: string;
  messageId?: string;
  chunk: string;
  isThought?: boolean;
  toolEvent?: ToolEventData;
}): Promise<void> {
  const { conversationId, messageId, chunk, isThought = false, toolEvent } = params;
  const key = getStreamKey(conversationId, messageId);
  const previous = pendingStreams.get(key) || Promise.resolve();
  const current = previous
    .catch(() => undefined)
    .then(async () => {
      const seq = await cacheRedis.incr(key);
      if (seq === 1) {
        await cacheRedis.expire(key, STREAM_SEQ_TTL_SECONDS);
      }

      await publishStreamChunk({ conversationId, chunk, isThought, seq, messageId, toolEvent });
    });

  pendingStreams.set(key, current);
  try {
    await current;
  } finally {
    if (pendingStreams.get(key) === current) {
      pendingStreams.delete(key);
    }
  }
}

export async function waitForPendingStream(
  conversationId: string,
  messageId?: string,
): Promise<void> {
  await pendingStreams.get(getStreamKey(conversationId, messageId));
}
