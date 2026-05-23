/**
 * Composite worker guard (P0-010).
 *
 * Wraps a worker body with both a distributed lock (so multi-instance
 * deploys don't double-execute the same scheduled task) and the
 * declared failure mode (so error semantics are explicit per worker).
 *
 *   await runGuardedJob({
 *     name: 'TimeCapsuleWorker',
 *     expectedDurationMs: 4 * 60_000, // p99 from production logs
 *     failureMode: 'LOG_AND_CONTINUE',
 *     lock,
 *     logger: this.logger,
 *   }, () => this.runOnce());
 *
 * Mandatory for every worker (cron + queue consumer). When the lock is
 * held by another instance, the call is a silent skip — `info` log only
 * — so the scheduler keeps firing without retry storms. The lock TTL
 * is `max(2 × expectedDurationMs, 5 minutes)`: long enough that an
 * in-flight worker on a slow run keeps its lock, short enough that a
 * crashed pod's lock auto-releases within a tolerable window.
 *
 * Sister utilities:
 *   - `DistributedLockPort.withLock()` — same primitive used here.
 *   - `runWithFailureMode()` — the failure-mode wrapper alone, kept
 *      exported for one-shot scripts that don't need locking.
 */

import type { DistributedLockPort } from '@/shared-kernel/concurrency/distributed-lock.port';
import type { LoggerPort } from '@/shared-kernel/logger/logger.port';
import { runWithFailureMode, type WorkerFailureMode } from './worker-failure-mode';

const MIN_LOCK_TTL_MS = 5 * 60_000; // 5 minutes — floor for very short workers

export interface GuardedJobOptions {
  /** Stable worker name. Used as `worker:<name>` for the lock key. */
  readonly name: string;
  /** p99 expected wallclock duration. Lock TTL = max(2x, 5min). */
  readonly expectedDurationMs: number;
  /** Failure semantics when the body throws. */
  readonly failureMode: WorkerFailureMode;
  readonly lock: DistributedLockPort;
  readonly logger: LoggerPort;
}

/**
 * Run `fn` under the worker's distributed lock and configured failure
 * mode. Resolves with no value when the body completes (or when the
 * lock was held by another instance — the silent-skip case).
 */
export async function runGuardedJob(
  opts: GuardedJobOptions,
  fn: () => Promise<void>,
): Promise<void> {
  const ttlMs = Math.max(opts.expectedDurationMs * 2, MIN_LOCK_TTL_MS);
  const key = `worker:${opts.name}`;
  const ctx = { worker: opts.name, logger: opts.logger };

  // `withLock` returns `null` when another instance holds the lock.
  // Skip silently — we don't want a retry storm; the scheduler will
  // fire again on its normal cadence.
  const result = await opts.lock.withLock(key, { ttlMs }, async () => {
    await runWithFailureMode(ctx, opts.failureMode, fn);
    return 'ran' as const;
  });

  if (result === null) {
    opts.logger.log(`${opts.name} skipped — lock held by another instance`, opts.name, {
      lockKey: key,
      ttlMs,
    });
  }
}
