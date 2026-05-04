import type { ResumeUpdatedEvent } from '@/bounded-contexts/resumes';
import type { LoggerPort } from '@/shared-kernel';
import type { JobQueuePort } from '@/shared-kernel/jobs/job-queue.port';
import { RESUME_QUALITY_QUEUE, type ResumeQualityJobData } from '../workers/resume-quality.worker';

/**
 * Fans `ResumeUpdatedEvent` into the `resume-quality` queue so the
 * Content Quality recompute runs out-of-band. `jobId` dedupes bursts of
 * saves from a single editing session into one recompute.
 *
 * Framework-free POJO. Registered against `EventBusPort` from the
 * composition root via a side-effect provider.
 */
export class ResumeQualityOnResumeUpdatedHandler {
  constructor(
    private readonly queue: JobQueuePort,
    private readonly logger: LoggerPort,
  ) {}

  async onResumeUpdated(event: ResumeUpdatedEvent): Promise<void> {
    try {
      await this.queue.enqueue<ResumeQualityJobData>(
        RESUME_QUALITY_QUEUE,
        { kind: 'recompute', resumeId: event.aggregateId, sourceEventId: event.eventId },
        { jobId: `resume-quality:${event.aggregateId}` },
      );
    } catch (err) {
      this.logger.error(`Failed to enqueue resume-quality recompute for resume ${event.aggregateId}`, { context: 'ResumeQualityOnResumeUpdatedHandler', stack: err instanceof Error ? err.stack : undefined });
      throw err;
    }
  }
}
