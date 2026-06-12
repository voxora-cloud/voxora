import { cacheRedis } from "./redis.client";
import { internalApi } from "../api/internal.client";

const CACHE_TTL_SECONDS = parseInt(
  process.env.CONVERSATION_CACHE_TTL_SECONDS || "5",
  10,
);
const CACHE_PREFIX = "ai:conversation";

export interface ConversationGate {
  status?: string;
  assignedTo?: string | null;
  metadata?: {
    escalatedAt?: string | null;
    humanJoinedAt?: string | null;
  };
}

interface CachedGate {
  missing?: boolean;
  status?: string;
  assignedTo?: string | null;
  metadata?: {
    escalatedAt?: string | null;
    humanJoinedAt?: string | null;
  };
}

export async function getConversationGate(
  conversationId: string,
  organizationId: string,
): Promise<ConversationGate | null> {
  if (!conversationId) return null;
  const key = `${CACHE_PREFIX}:${conversationId}`;

  const cached = await cacheRedis.get(key);
  if (cached) {
    try {
      const parsed = JSON.parse(cached) as CachedGate;
      if (parsed.missing) return null;
      return {
        status: parsed.status,
        assignedTo: parsed.assignedTo ?? null,
        metadata: parsed.metadata ?? {},
      };
    } catch {
      await cacheRedis.del(key);
    }
  }

  try {
    const { data } = await internalApi.get(
      `/conversations/ai/${conversationId}/gate`,
      { params: { organizationId } },
    );

    const gate: ConversationGate = data?.data?.gate ?? null;

    if (!gate) {
      await cacheRedis.set(key, JSON.stringify({ missing: true }), "EX", CACHE_TTL_SECONDS);
      return null;
    }

    await cacheRedis.set(key, JSON.stringify(gate), "EX", CACHE_TTL_SECONDS);
    return gate;
  } catch (err: any) {
    if (err?.response?.status === 404) {
      await cacheRedis.set(key, JSON.stringify({ missing: true }), "EX", CACHE_TTL_SECONDS);
      return null;
    }
    // On unexpected errors, skip the cache and return null gracefully
    return null;
  }
}

export async function invalidateConversationGate(conversationId: string): Promise<void> {
  if (!conversationId) return;
  await cacheRedis.del(`${CACHE_PREFIX}:${conversationId}`);
}
