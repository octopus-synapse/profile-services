import type { ResumeUpdatedEvent } from '@/bounded-contexts/resumes';
import type { JobQueuePort } from '@/shared-kernel/jobs/job-queue.port';
import {
  RESUME_QUALITY_QUEUE,
  type ResumeQualityJobData,
} from '../workers/resume-quality.worker';

/**
 * Fans `ResumeUpdatedEvent` into the `resume-quality` queue so the
 * Content Quality recompute runs out-of-band. `jobId` dedupes bursts of
 * saves from a single editing session into one recompute.
 *
 * Framework-free POJO. Registered against `EventBusPort` from the
 * BC's Nest module via a side-effect provider.
 */
export class ResumeQualityOnResumeUpdatedHandler {
  constructor(private readonly queue: JobQueuePort) {}

  async onResumeUpdated(event: ResumeUpdatedEvent): Promise<void> {
    await this.queue.enqueue<ResumeQualityJobData>(
      RESUME_QUALITY_QUEUE,
      { kind: 'recompute', resumeId: event.aggregateId, sourceEventId: event.eventId },
      { jobId: `resume-quality:${event.aggregateId}` },
    );
  }
}
