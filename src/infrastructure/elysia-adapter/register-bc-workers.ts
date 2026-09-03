/**
 * The one place BC `workers` bindings meet the `JobQueuePort`.
 *
 * Every `build*Composition` that owns a BullMQ processor exposes it as a
 * `BcWorkerBinding` and relies on the bootstrap to call
 * `queue.register(b.queue, b.process)` — the contract in
 * `shared-kernel/composition`. Until this helper existed nothing did that
 * loop: the bindings were built, returned, and dropped, so every queue with a
 * producer (resume-quality recompute, job-match recompute, daily
 * recommendations, expiry reminders, fit-profile expiry, auto-apply,
 * weekly-curated) filled up with jobs nobody consumed.
 *
 * `enabledWhen` bindings are evaluated against the feature-flag service at
 * boot. A flag that is off (or cannot be read — fail closed) leaves the queue
 * without a consumer; that is logged once here so an operator reading the
 * boot log knows the queue is intentionally inert rather than forgotten.
 *
 * Kept out of `elysia-bootstrap.ts` so the gating is unit-testable and the
 * static `queue-consumers` spec has a single call site to look at.
 */

import type { BcWorkerBinding } from '@/shared-kernel/composition';
import type { JobQueuePort } from '@/shared-kernel/jobs/job-queue.port';
import type { LoggerPort } from '@/shared-kernel/logger/logger.port';

const CTX = 'BcWorkers';

export interface WorkerFlagReader {
  isEnabled(key: string, userId: string | null): Promise<boolean>;
}

/** A mounted BC's worker bindings, named for the boot log. */
export interface WorkerOwner {
  readonly name: string;
  readonly workers?: ReadonlyArray<BcWorkerBinding> | undefined;
}

export interface RegisteredWorker {
  readonly owner: string;
  readonly queue: string;
  readonly status: 'consuming' | 'inert';
  readonly gatedBy?: string;
}

export interface RegisterBcWorkersDeps {
  readonly queue: JobQueuePort;
  readonly flags: WorkerFlagReader;
  readonly logger: LoggerPort;
}

export async function registerBcWorkers(
  deps: RegisterBcWorkersDeps,
  owners: ReadonlyArray<WorkerOwner>,
): Promise<ReadonlyArray<RegisteredWorker>> {
  const { queue, flags, logger } = deps;
  const registered: RegisteredWorker[] = [];

  for (const owner of owners) {
    for (const binding of owner.workers ?? []) {
      if (binding.enabledWhen !== undefined) {
        const enabled = await readFlag(flags, binding.enabledWhen, logger);
        if (!enabled) {
          logger.warn(
            `Worker "${binding.queue}" (${owner.name}) is INERT: flag "${binding.enabledWhen}" is off — the queue has no consumer this boot`,
            CTX,
          );
          registered.push({
            owner: owner.name,
            queue: binding.queue,
            status: 'inert',
            gatedBy: binding.enabledWhen,
          });
          continue;
        }
      }
      queue.register(binding.queue, binding.process);
      logger.log(`Worker registered: "${binding.queue}" (${owner.name})`, CTX);
      registered.push(
        binding.enabledWhen === undefined
          ? { owner: owner.name, queue: binding.queue, status: 'consuming' }
          : {
              owner: owner.name,
              queue: binding.queue,
              status: 'consuming',
              gatedBy: binding.enabledWhen,
            },
      );
    }
  }

  const consuming = registered.filter((r) => r.status === 'consuming').length;
  logger.log(
    `${consuming}/${registered.length} BC workers consuming (${registered.length - consuming} inert)`,
    CTX,
  );
  return registered;
}

/** Fail closed: a flag we cannot read is treated as off. */
async function readFlag(
  flags: WorkerFlagReader,
  key: string,
  logger: LoggerPort,
): Promise<boolean> {
  try {
    return await flags.isEnabled(key, null);
  } catch (err) {
    logger.error(`Could not evaluate worker flag "${key}"; treating as off`, {
      context: CTX,
      stack: err instanceof Error ? err.stack : undefined,
    });
    return false;
  }
}
