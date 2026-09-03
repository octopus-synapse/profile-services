import type { ResumeCreatedEvent, ResumeUpdatedEvent } from '@/bounded-contexts/resumes';
import type { LoggerPort } from '@/shared-kernel';
import type { JobQueuePort } from '@/shared-kernel/jobs/job-queue.port';
import {
  RESUME_TRANSLATION_QUEUE,
  type ResumeTranslationJobData,
} from '../workers/resume-translation.worker';

/** Sliding window: a burst of saves collapses into one derivation. */
export const TRANSLATION_DEBOUNCE_MS = 15_000;

/**
 * Stage 1 of the write-through (ADR-003 §3): every résumé change becomes one
 * delayed job per résumé. `queue.remove` before `enqueue` restarts the timer
 * instead of deduplicating — the last save is the fire point. Which items
 * actually need a call is decided later by the hash, not here.
 */
export class TranslationOnResumeChangedHandler {
  constructor(
    private readonly queue: JobQueuePort,
    private readonly logger: LoggerPort,
  ) {}

  async onResumeChanged(event: ResumeUpdatedEvent | ResumeCreatedEvent): Promise<void> {
    const jobId = `resume-translation:${event.aggregateId}`;
    try {
      await this.queue.remove(RESUME_TRANSLATION_QUEUE, jobId);
      await this.queue.enqueue<ResumeTranslationJobData>(
        RESUME_TRANSLATION_QUEUE,
        { kind: 'derive', resumeId: event.aggregateId, sourceEventId: event.eventId },
        { jobId, delay: TRANSLATION_DEBOUNCE_MS },
      );
    } catch (err) {
      this.logger.error(`Failed to enqueue translation for resume ${event.aggregateId}`, {
        context: 'TranslationOnResumeChangedHandler',
        stack: err instanceof Error ? err.stack : undefined,
      });
      throw err;
    }
  }
}
