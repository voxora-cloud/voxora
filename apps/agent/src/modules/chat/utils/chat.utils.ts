// ── FAQ pre-filter ─────────────────────────────────────────────────────────
// Skip the FAQ embedding+search for messages that are clearly not questions.
// This saves 3-4s of embedding latency on casual messages.
const FAQ_SKIP_WORDS =
  /^(ok|okay|sure|yes|no|yeah|nope|yep|alright|thanks|thank you|thx|ty|cool|nice|great|awesome|bye|goodbye|got it|understood|sounds good|right|exactly|perfect|gotcha|hey|hi|hello|yo|sup|howdy|greetings)\b/i;
const FAQ_QUESTION_STARTERS =
  /^(what|who|where|when|why|how|which|can|could|would|should|is|are|do|does|did|will|may|might|tell me|explain|show me|help me|i need|i want|how to)\b/i;
const FAQ_MIN_LENGTH = 10;

/**
 * Determine if a customer message is likely a question that warrants an FAQ search.
 */
export function isLikelyQuestion(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length < FAQ_MIN_LENGTH) return false;
  if (FAQ_SKIP_WORDS.test(trimmed)) return false;
  if (trimmed.includes("?")) return true;
  if (FAQ_QUESTION_STARTERS.test(trimmed)) return true;
  return false;
}

/**
 * Decide if a conversation should skip AI processing (e.g. if resolved, closed, or human agent assigned).
 */
export function shouldSkipConversation(
  gate: {
    status?: string;
    assignedTo?: string | null;
    metadata?: { escalatedAt?: string | null; humanJoinedAt?: string | null };
  } | null,
): boolean {
  if (!gate) return false;
  if (
    gate.metadata?.escalatedAt ||
    gate.metadata?.humanJoinedAt ||
    gate.assignedTo
  ) {
    return true;
  }
  return ["active", "resolved", "closed"].includes(gate.status || "");
}

/**
 * Extract a clean 6-digit numeric OTP code if present.
 */
export function exactOtpCode(content: string): string | null {
  const normalized = content.trim().replace(/\s/g, "");
  return /^\d{6}$/.test(normalized) ? normalized : null;
}

/**
 * Redact numeric OTP codes from text blocks to prevent credential leaking in worker logs.
 */
export function redactOtpForLog(content: string): string {
  return content.replace(/\b\d{6}\b/g, "[6-digit verification code]");
}
