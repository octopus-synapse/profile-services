/**
 * No-op `JobQueuePort` used when BullMQ is disabled (`ENABLE_BULLMQ=false`
 * or no `REDIS_HOST`) — dev boxes and the test harness boot without a
 * working Redis. Every operation is a silent no-op.
 *
 * It MUST be a real `JobQueuePort` subclass (not an inline object literal
 * cast to the port) so it inherits the port's default `remove()`. The
 * previous inline `as never` literal implemented only register/enqueue/
 * schedule; a caller invoking the *sliding-debounce* `remove()` (e.g.
 * `ResumeQualityOnResumeUpdatedHandler`) hit `remove is not a function`,
 * which — because that handler rethrows — surfaced as an unhandled
 * rejection and corrupted test ordering.
 */

import { type JobOpts, type JobProcessor, JobQueuePort } from '@/shared-kernel/jobs/job-queue.port';

export class NoopJobQueueAdapter extends JobQueuePort {
  register<T>(_queue: string, _processor: JobProcessor<T>): void {}

  enqueue<T>(_queue: string, _data: T, _opts?: JobOpts): Promise<void> {
    return Promise.resolve();
  }

  schedule<T>(
    _queue: string,
    _data: T,
    _opts: JobOpts & { repeat: { pattern: string; tz?: string } },
  ): Promise<void> {
    return Promise.resolve();
  }

  // `remove()` intentionally not overridden — the port's default no-op
  // is exactly the desired behaviour and keeps the contract complete.
}
