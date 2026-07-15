import logger from "../../../shared/logger";

// ── Error Classification ────────────────────────────────────────────────────

export enum ModelFailureType {
  /** Transient — timeout, 500, connection reset. Try next model but don't kill it. */
  RETRYABLE = "RETRYABLE",
  /** Bad request, validation error. Won't fix itself — skip model for this request only. */
  PERMANENT = "PERMANENT",
  /** Rate-limited / throttled. Cool down for a few minutes. */
  THROTTLED = "THROTTLED",
  /** IAM / use-case form / access denied. Needs manual fix — cool down 1h. */
  AUTHORIZATION = "AUTHORIZATION",
  /** Model retired by provider. Won't come back — cool down 24h. */
  MODEL_DEPRECATED = "MODEL_DEPRECATED",
}

interface ClassificationRule {
  type: ModelFailureType;
  patterns: RegExp[];
  cooldownMs: number;
}

const CLASSIFICATION_RULES: ClassificationRule[] = [
  {
    type: ModelFailureType.MODEL_DEPRECATED,
    patterns: [
      /end of (its )?life/i,
      /deprecated/i,
      /legacy.*model/i,
      /model identifier is invalid/i,
      /provided model identifier/i,
      /invalid model identifier/i,
    ],
    cooldownMs: 24 * 60 * 60 * 1000, // 24h — wrong/dead model ID won't fix itself
  },
  {
    type: ModelFailureType.AUTHORIZATION,
    patterns: [
      /access denied/i,
      /not authorized/i,
      /unauthorized/i,
      /use case details/i,
      /model use case/i,
      /permission/i,
    ],
    cooldownMs: 60 * 60 * 1000, // 1h
  },
  {
    type: ModelFailureType.THROTTLED,
    patterns: [
      /throttl/i,
      /rate limit/i,
      /too many requests/i,
      /service unavailable/i,
      /overloaded/i,
    ],
    cooldownMs: 5 * 60 * 1000, // 5min
  },
  {
    type: ModelFailureType.PERMANENT,
    patterns: [
      /validation exception/i,
      /bad request/i,
      /inference profile/i,
    ],
    cooldownMs: 60 * 60 * 1000, // 1h — model config issue, not request-specific
  },
];

export function classifyError(error: string): ModelFailureType {
  for (const rule of CLASSIFICATION_RULES) {
    if (rule.patterns.some((p) => p.test(error))) {
      return rule.type;
    }
  }
  return ModelFailureType.RETRYABLE;
}

function cooldownFor(type: ModelFailureType): number {
  const rule = CLASSIFICATION_RULES.find((r) => r.type === type);
  return rule?.cooldownMs ?? 0;
}

// ── Circuit Breaker / Model Health Tracker ──────────────────────────────────

interface HealthRecord {
  modelId: string;
  failureType: ModelFailureType;
  deadUntil: number; // epoch ms
  consecutiveFailures: number;
}

class ModelHealthTracker {
  private records = new Map<string, HealthRecord>();

  /** Max consecutive RETRYABLE failures before a short cool-down is applied. */
  private readonly maxRetryableFailures = 3;
  private readonly retryableCooldownMs = 60_000; // 1min

  /**
   * Returns true if the model is currently healthy and can be tried.
   * Dead models whose cooldown has expired are auto-recovered.
   */
  isHealthy(modelId: string): boolean {
    const rec = this.records.get(modelId);
    if (!rec) return true;

    if (Date.now() >= rec.deadUntil) {
      // Cooldown expired — auto-recover but keep consecutiveFailures for trend
      rec.deadUntil = 0;
      logger.info("[ModelHealth] Model recovered from cool-down", {
        modelId,
        failureType: rec.failureType,
      });
      return true;
    }

    return false;
  }

  /**
   * Mark a model as failed with a classified error.
   * Depending on the failure type, the model may be temporarily disabled.
   */
  markFailed(modelId: string, errorMessage: string): ModelFailureType {
    const type = classifyError(errorMessage);
    const cooldown = cooldownFor(type);

    let rec = this.records.get(modelId);
    if (!rec) {
      rec = {
        modelId,
        failureType: type,
        deadUntil: 0,
        consecutiveFailures: 0,
      };
      this.records.set(modelId, rec);
    }

    rec.failureType = type;
    rec.consecutiveFailures += 1;

    if (cooldown > 0) {
      rec.deadUntil = Date.now() + cooldown;
      logger.warn("[ModelHealth] Model marked dead", {
        modelId,
        failureType: type,
        cooldownMs: cooldown,
        deadUntil: new Date(rec.deadUntil).toISOString(),
      });
    } else if (
      type === ModelFailureType.RETRYABLE &&
      rec.consecutiveFailures >= this.maxRetryableFailures
    ) {
      rec.deadUntil = Date.now() + this.retryableCooldownMs;
      logger.warn("[ModelHealth] Model marked dead (retryable threshold)", {
        modelId,
        consecutiveFailures: rec.consecutiveFailures,
        cooldownMs: this.retryableCooldownMs,
      });
    }

    return type;
  }

  /** Reset a model's health after a successful call. */
  markHealthy(modelId: string): void {
    this.records.delete(modelId);
  }

  /** Returns a snapshot of currently-dead model IDs (for logging/debugging). */
  getDeadModels(): string[] {
    const now = Date.now();
    return [...this.records.values()]
      .filter((r) => r.deadUntil > now)
      .map((r) => r.modelId);
  }
}

export const modelHealth = new ModelHealthTracker();
