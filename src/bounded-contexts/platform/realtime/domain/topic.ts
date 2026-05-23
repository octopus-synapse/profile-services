/**
 * Type-safe topic catalogue. Topics are strings with structured
 * prefixes (`user:UID`, `notifications:UID`, …). Helpers below give
 * call sites a typed, typo-resistant way to build the strings the
 * SSE hub uses for fan-out.
 *
 * The frontend subscribes to a comma-separated list via the
 * `?topics=` query param on `/v1/stream`; `parseTopics` is the
 * inverse used by the route handler.
 */
export type Topic =
  | `user:${string}`
  | `feature-flags:global`
  | `notifications:${string}`
  | `chat:${string}`
  | `analytics:${string}`
  | `lockout:${string}`;

export function userTopic(userId: string): Topic {
  return `user:${userId}`;
}

export function notificationsTopic(userId: string): Topic {
  return `notifications:${userId}`;
}

export function chatTopic(userId: string): Topic {
  return `chat:${userId}`;
}

export function analyticsTopic(resumeId: string): Topic {
  return `analytics:${resumeId}`;
}

export function lockoutTopic(userId: string): Topic {
  return `lockout:${userId}`;
}

export const FEATURE_FLAGS_GLOBAL_TOPIC: Topic = 'feature-flags:global';

export function parseTopics(csv: string): Topic[] {
  return csv
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean) as Topic[];
}
