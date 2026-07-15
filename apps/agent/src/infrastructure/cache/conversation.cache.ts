import { cacheRedis } from "./redis.client";
import { InternalApiService } from "../api/internal-api.service";

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
  interactionSource?: string;
}

interface CachedGate {
  missing?: boolean;
  status?: string;
  assignedTo?: string | null;
  metadata?: {
    escalatedAt?: string | null;
    humanJoinedAt?: string | null;
  };
  interactionSource?: string;
}

function parseGateData(parsed: any): ConversationGate {
  return {
    status: parsed.status,
    assignedTo: parsed.assignedTo ?? null,
    metadata: {
      escalatedAt: parsed.escalatedAt ?? parsed.metadata?.escalatedAt ?? null,
      humanJoinedAt: parsed.humanJoinedAt ?? parsed.metadata?.humanJoinedAt ?? null,
    },
    interactionSource: parsed.interactionSource ?? parsed.metadata?.interactionSource ?? undefined,
  };
}

export async function getConversationGate(
  conversationId: string,
  organizationId: string,
): Promise<ConversationGate | null> {
  if (!conversationId) return null;

  // 1. Try checking the shared socket gatekeeper key first to skip Gateway HTTP callback overhead
  const sharedKey = `conversation:${conversationId}:gate`;
  const sharedCached = await cacheRedis.get(sharedKey);
  if (sharedCached) {
    try {
      const parsed = JSON.parse(sharedCached);
      return parseGateData(parsed);
    } catch {
      await cacheRedis.del(sharedKey);
    }
  }

  // 2. Fall back to local prefix key
  const localKey = `${CACHE_PREFIX}:${conversationId}`;
  const localCached = await cacheRedis.get(localKey);
  if (localCached) {
    try {
      const parsed = JSON.parse(localCached) as CachedGate;
      if (parsed.missing) return null;
      return parseGateData(parsed);
    } catch {
      await cacheRedis.del(localKey);
    }
  }

  // 3. Load from Gateway API if missing in both
  try {
    const gate = await InternalApiService.getConversationGate(conversationId, organizationId);

    if (!gate) {
      await cacheRedis.set(localKey, JSON.stringify({ missing: true }), "EX", CACHE_TTL_SECONDS);
      return null;
    }

    await cacheRedis.set(localKey, JSON.stringify(gate), "EX", CACHE_TTL_SECONDS);
    return gate;
  } catch (err: any) {
    if (err?.response?.status === 404) {
      await cacheRedis.set(localKey, JSON.stringify({ missing: true }), "EX", CACHE_TTL_SECONDS);
      return null;
    }
    // On unexpected errors, skip the cache and return null gracefully
    return null;
  }
}

export async function invalidateConversationGate(conversationId: string): Promise<void> {
  if (!conversationId) return;
  await Promise.all([
    cacheRedis.del(`${CACHE_PREFIX}:${conversationId}`),
    cacheRedis.del(`conversation:${conversationId}:gate`),
  ]);
}
