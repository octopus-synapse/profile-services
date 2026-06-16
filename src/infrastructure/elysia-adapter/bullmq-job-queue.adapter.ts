/**
 * Bun-native `JobQueuePort` impl backed by raw BullMQ — no
 * `@nestjs/bullmq` shim. Mirrors the Nest-side adapter's behaviour:
 * lazy queue creation on first enqueue/schedule, single-registration
 * per worker, same Redis keys (so jobs queued by the Nest version
 * are picked up byte-identical by this one during the migration).
 *
 * `dispose()` closes every Worker + Queue gracefully — wired by the
 * bootstrap on SIGTERM.
 */

import { Queue, Worker } from 'bullmq';
import { type JobOpts, type JobProcessor, JobQueuePort } from '@/shared-kernel/jobs/job-queue.port';
import type { Lifecycle } from '@/shared-kernel/lifecycle/lifecycle.port';
import type { LoggerPort } from '@/shared-kernel/logger/logger.port';

export interface RedisConnection {
  readonly host: string;
  readonly port: number;
  readonly password?: string;
}

const MAX_RECONNECT_ATTEMPTS = 5;

/**
 * P1-034 — default per-job retry policy applied to every queue. The
 * historic behaviour was BullMQ's no-retry default: a single transient
 * failure (cold Postgres pool, momentary OpenAI 5xx) tore the job to
 * the failed-set with no second chance. 3 attempts with exponential
 * backoff (5s → 10s → 20s) covers the common transient-failure window
 * without piling on for genuine bugs. Per-call `JobOpts` still wins
 * (we merge with `{ ...DEFAULT_JOB_OPTIONS, ...opts }` below).
 */
const DEFAULT_JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 5000 },
  removeOnComplete: { age: 24 * 60 * 60, count: 1000 },
  removeOnFail: { age: 7 * 24 * 60 * 60 },
};

export class BullMQJobQueueAdapter extends JobQueuePort implements Lifecycle {
  private readonly queues = new Map<string, Queue>();
  private readonly workers = new Map<string, Worker>();
  private degraded = false;

  constructor(
    private readonly redisConnection: RedisConnection,
    private readonly logger?: LoggerPort,
  ) {
    super();
  }

  /** Returns the BullMQ connection options with bounded reconnect — if
   *  Redis auth fails or the host is unreachable the worker stops
   *  retrying after `MAX_RECONNECT_ATTEMPTS` instead of spamming logs. */
  private connectionOpts() {
    const adapter = this;
    return {
      ...this.redisConnection,
      maxRetriesPerRequest: null,
      retryStrategy(times: number): number | null {
        if (times > MAX_RECONNECT_ATTEMPTS) {
          if (!adapter.degraded) {
            adapter.degraded = true;
            adapter.logger?.error(
              `BullMQ Redis connection failed after ${MAX_RECONNECT_ATTEMPTS} attempts; queue running in degraded mode`,
              { context: 'BullMQJobQueueAdapter' },
            );
          }
          return null;
        }
        return Math.min(times * 200, 2000);
      },
    };
  }

  register<T>(name: string, processor: JobProcessor<T>): void {
    if (this.workers.has(name)) {
      throw new Error(`Worker for "${name}" already registered`);
    }
    const worker = new Worker<T>(
      name,
      async (job) => {
        await processor({ data: job.data, id: job.id });
      },
      { connection: this.connectionOpts() },
    );
    worker.on('error', (err) => {
      this.logger?.error(`BullMQ worker "${name}" error: ${err.message}`, {
        context: 'BullMQJobQueueAdapter',
        stack: err.stack,
      });
    });
    this.workers.set(name, worker as unknown as Worker);
  }

  async enqueue<T>(name: string, data: T, opts?: JobOpts): Promise<void> {
    const queue = this.getOrCreateQueue<T>(name);
    // P1 #42: BullMQ honours `jobId` as a native dedup primitive — when
    // two `.add()` calls share the same jobId the second one is silently
    // dropped. Surface it explicitly here (separate from the rest of
    // `opts` so a future refactor can't accidentally drop it) and pass
    // it as the 4th positional `{ jobId }` BullMQ slot. Callers that
    // need idempotency build a deterministic id from the payload via
    // `deterministicJobId()` (see helper below).
    const bullOpts = { ...DEFAULT_JOB_OPTIONS, ...opts };
    if (opts?.jobId !== undefined) {
      (bullOpts as { jobId?: string }).jobId = opts.jobId;
    }
    await (queue as unknown as { add: (n: string, d: T, o?: unknown) => Promise<unknown> }).add(
      name,
      data,
      // P1-034: merge so per-call opts can override the defaults
      // (e.g. an `attempts: 1` for fire-and-forget jobs).
      bullOpts,
    );
  }

  async schedule<T>(
    name: string,
    data: T,
    opts: JobOpts & { repeat: { pattern: string; tz?: string } },
  ): Promise<void> {
    const queue = this.getOrCreateQueue<T>(name);
    await (queue as unknown as { add: (n: string, d: T, o?: unknown) => Promise<unknown> }).add(
      name,
      data,
      { ...DEFAULT_JOB_OPTIONS, ...opts, repeat: opts.repeat },
    );
  }

  /** Sliding-debounce primitive: remove a delayed/waiting job by id so a
   *  subsequent `enqueue` with the same jobId restarts the delay timer
   *  (BullMQ would otherwise drop the duplicate add and keep the original
   *  fire time). Best-effort — a missing or already-running job is a no-op. */
  override async remove(name: string, jobId: string): Promise<void> {
    const queue = this.getOrCreateQueue(name);
    try {
      const job = await (
        queue as unknown as { getJob: (id: string) => Promise<{ remove: () => Promise<void> } | undefined> }
      ).getJob(jobId);
      await job?.remove();
    } catch (err) {
      this.logger?.warn?.(
        `BullMQ remove("${name}", "${jobId}") failed: ${(err as Error).message}`,
        'BullMQJobQueueAdapter',
      );
    }
  }

  async dispose(): Promise<void> {
    await Promise.all([...this.workers.values()].map((w) => w.close()));
    await Promise.all([...this.queues.values()].map((q) => q.close()));
    this.workers.clear();
    this.queues.clear();
  }

  private getOrCreateQueue<T>(name: string): Queue<T> {
    let q = this.queues.get(name) as Queue<T> | undefined;
    if (!q) {
      q = new Queue<T>(name, { connection: this.connectionOpts() });
      this.queues.set(name, q as unknown as Queue);
    }
    return q;
  }
}
