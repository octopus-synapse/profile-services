/**
 * BullMQ adapter for `JobQueuePort`. Owns the lifecycle of every
 * `Queue` and `Worker` the app uses. Lazily creates a `Queue` on the
 * first `enqueue`/`schedule` call and refuses to register the same
 * worker twice.
 *
 * Composition entry points (one per BC) call `register('queue-name',
 * worker.process.bind(worker))` at app boot — Nest workers stop being
 * `WorkerHost` subclasses with `@Processor`, becoming framework-free
 * POJOs.
 */

import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type Queue, Worker } from 'bullmq';
import {
  type JobOpts,
  type JobProcessor,
  JobQueuePort,
} from '@/shared-kernel/jobs/job-queue.port';

export interface RedisConnection {
  readonly host: string;
  readonly port: number;
  readonly password?: string;
}

export const REDIS_CONNECTION = Symbol('REDIS_CONNECTION');

@Injectable()
export class BullMQJobQueueAdapter extends JobQueuePort {
  private readonly queues = new Map<string, Queue>();
  private readonly workers = new Map<string, Worker>();

  constructor(@Inject(REDIS_CONNECTION) private readonly redisConnection: RedisConnection) {
    super();
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
      { connection: this.redisConnection },
    );
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

  private getOrCreateQueue<T>(name: string): Queue<T> {
    let q = this.queues.get(name) as Queue<T> | undefined;
    if (!q) {
      // Use require lazily so test doubles can avoid spinning up a
      // real BullMQ Queue instance.
      const bullmq = require('bullmq') as typeof import('bullmq');
      q = new bullmq.Queue<T>(name, { connection: this.redisConnection });
      this.queues.set(name, q as unknown as Queue);
    }
    return q;
  }
}

export const redisConnectionProvider = {
  provide: REDIS_CONNECTION,
  useFactory: (config: ConfigService): RedisConnection => ({
    host: config.get<string>('REDIS_HOST', 'localhost'),
    port: config.get<number>('REDIS_PORT', 6379),
    password: config.get<string>('REDIS_PASSWORD'),
  }),
  inject: [ConfigService],
};
