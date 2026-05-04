import type { ResumeUpdatedEvent } from '@/bounded-contexts/resumes';
import type { LoggerPort } from '@/shared-kernel';
import type { JobQueuePort } from '@/shared-kernel/jobs/job-queue.port';
import {
  JOB_MATCH_RECOMPUTE_QUEUE,
  type JobMatchRecomputeJobData,
} from '../workers/job-match-recompute.worker';

/**
 * Fans `ResumeUpdatedEvent` into the `job-match-recompute` queue so the
 * Match Score cache invalidation runs out-of-band.
 *
 * Framework-free POJO. Registered against `EventBusPort` from the
 * composition root via a side-effect provider.
 */
export class JobMatchRecomputeOnResumeUpdatedHandler {
  constructor(
    private readonly queue: JobQueuePort,
    private readonly logger: LoggerPort,
  ) {}

  async onResumeUpdated(event: ResumeUpdatedEvent): Promise<void> {
    try {
      await this.queue.enqueue<JobMatchRecomputeJobData>(
        JOB_MATCH_RECOMPUTE_QUEUE,
        { kind: 'invalidate-resume', resumeId: event.aggregateId },
        { jobId: `match-invalidate:resume:${event.aggregateId}` },
      );
    } catch (err) {
      this.logger.error(`Failed to enqueue job-match recompute for resume ${event.aggregateId}`, { context: 'JobMatchRecomputeOnResumeUpdatedHandler', stack: err instanceof Error ? err.stack : undefined });
      throw err;
    }
  }
}
