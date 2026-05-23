/**
 * Deterministic BullMQ `jobId` helper (P1 #42).
 *
 * When a job is conceptually idempotent (cache-invalidation,
 * resume-quality re-score, expiry reminder) we want BullMQ's native
 * de-duplication: two `.add(...)` calls that share the same `jobId`
 * collapse into a single queue entry. Without this, a transient
 * worker error + retry storm can enqueue the same logical job dozens
 * of times.
 *
 * The id is a short SHA-256 prefix of `queueName + canonical(payload)`.
 * Two callers in different processes that compute the id from the same
 * inputs land on the same value — that is the whole point of "native
 * dedup": consistency across replicas without an external lock.
 *
 * Usage:
 *
 *   await queue.enqueue('cache-invalidation', { key }, {
 *     jobId: deterministicJobId('cache-invalidation', { key }),
 *   });
 *
 * Use only when "same payload = same job" is true. For
 * order-sensitive jobs (chat send, audit row) pass a globally unique
 * id (UUID) or omit it.
 */

import { createHash } from 'node:crypto';

const JOB_ID_HEX_LENGTH = 24;

function canonicalize(value: unknown): string {
  if (value === null || value === undefined) return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  if (typeof value === 'object') {
    const keys = Object.keys(value as Record<string, unknown>).sort();
    const entries = keys.map(
      (k) => `${JSON.stringify(k)}:${canonicalize((value as Record<string, unknown>)[k])}`,
    );
    return `{${entries.join(',')}}`;
  }
  return JSON.stringify(value);
}

export function deterministicJobId(queueName: string, payload: unknown): string {
  const fingerprint = `${queueName}:${canonicalize(payload)}`;
  return createHash('sha256').update(fingerprint).digest('hex').slice(0, JOB_ID_HEX_LENGTH);
}
