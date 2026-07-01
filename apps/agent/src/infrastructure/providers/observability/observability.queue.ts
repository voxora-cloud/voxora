import { Queue } from "bullmq";
import { getBullMQConnection } from "../../queue/bullmq.client";
import { AICallEvent } from "../types/ai.types";

export const AI_OBSERVABILITY_QUEUE = "ai-observability";

let _queue: Queue<AICallEvent> | undefined;

function getQueue(): Queue<AICallEvent> {
  if (!_queue) {
    _queue = new Queue<AICallEvent>(AI_OBSERVABILITY_QUEUE, {
      connection: getBullMQConnection(),
      defaultJobOptions: {
        attempts: 2,
        backoff: { type: "exponential", delay: 500 },
        removeOnComplete: 500,
        removeOnFail: 100,
      },
    });
  }
  return _queue;
}

/**
 * Fire-and-forget enqueue of an AI call observability event.
 * Failures are silently caught so they never affect the hot path.
 */
export function trackAICall(event: AICallEvent): void {
  getQueue()
    .add("track", event, { priority: 10 })
    .catch(() => {
      // Intentionally silent — observability must never break the primary flow
    });
}
