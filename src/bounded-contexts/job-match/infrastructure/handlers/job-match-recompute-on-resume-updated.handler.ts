import type { ResumeUpdatedEvent } from '@/bounded-contexts/resumes';
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
 * BC's Nest module via a side-effect provider.
 */
export class JobMatchRecomputeOnResumeUpdatedHandler {
  constructor(private readonly queue: JobQueuePort) {}

  async onResumeUpdated(event: ResumeUpdatedEvent): Promise<void> {
    await this.queue.enqueue<JobMatchRecomputeJobData>(
      JOB_MATCH_RECOMPUTE_QUEUE,
      { kind: 'invalidate-resume', resumeId: event.aggregateId },
      { jobId: `match-invalidate:resume:${event.aggregateId}` },
    );
  }
}
