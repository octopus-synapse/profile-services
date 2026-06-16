/**
 * Framework-free background-job port. Wraps BullMQ today; future
 * adapters could swap in SQS / RabbitMQ / in-memory without touching
 * domain code.
 *
 * Workers stop being `WorkerHost` subclasses with `@Processor`; they
 * become POJOs with a `process(job)` method that the BC's composition
 * registers via `queue.register('queue-name', worker.process.bind(worker))`.
 */

export interface JobOpts {
  readonly delay?: number;
  readonly attempts?: number;
  readonly jobId?: string;
  /** BullMQ-compatible repeat spec — adapters that don't speak cron
   *  pass it through to whatever recurrence primitive they have. */
  readonly repeat?: { pattern: string; tz?: string };
}

export type JobProcessor<T> = (job: { data: T; id?: string }) => Promise<void>;

export abstract class JobQueuePort {
  /** Register a processor for a queue. Must be called once per queue
   *  during composition; firing the same queue twice should throw. */
  abstract register<T>(queue: string, processor: JobProcessor<T>): void;

  /** Enqueue a one-off job. */
  abstract enqueue<T>(queue: string, data: T, opts?: JobOpts): Promise<void>;

  /** Schedule a recurring job (cron pattern). Idempotent — calling
   *  twice with the same `opts.jobId` should not double-schedule. */
  abstract schedule<T>(
    queue: string,
    data: T,
    opts: JobOpts & { repeat: { pattern: string; tz?: string } },
  ): Promise<void>;

  /** Remove a (possibly delayed) job by id. Enables a *sliding* debounce:
   *  drop the in-flight delayed job before re-enqueuing so the timer
   *  restarts on each new save. Best-effort — adapters without removal
   *  support no-op (default). */
  remove(_queue: string, _jobId: string): Promise<void> {
    return Promise.resolve();
  }
}
