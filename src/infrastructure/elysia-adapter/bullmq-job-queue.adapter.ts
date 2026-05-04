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
    await (queue as unknown as { add: (n: string, d: T, o?: unknown) => Promise<unknown> }).add(
      name,
      data,
      opts,
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
      { ...opts, repeat: opts.repeat },
    );
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
