import type { ResumeUpdatedEvent } from '@/bounded-contexts/resumes';
import type { LoggerPort } from '@/shared-kernel';
import type { JobQueuePort } from '@/shared-kernel/jobs/job-queue.port';
import { RESUME_QUALITY_QUEUE, type ResumeQualityJobData } from '../workers/resume-quality.worker';

/** Scalar resume fields whose change feeds the AI Content Quality grader
 * (the only top-level field the AI reads as gradeable prose). */
const AI_CONTENT_SCALAR_FIELDS = new Set(['summary']);

/** Section kinds whose item edits change gradeable bullet text. Encoded by
 * the section-item use-cases as `sections:<semanticKind>` changedFields. */
const AI_CONTENT_SECTION_KINDS = new Set(['WORK_EXPERIENCE', 'SUMMARY', 'PROJECT', 'VOLUNTEER']);

const SECTION_PREFIX = 'sections:';

/** Debounce window (ms) before an AI-bearing recompute runs — lets a burst
 * of edits in one session settle into a single graded call. Within the
 * 10–30s product decision. Completeness-only recomputes skip the delay. */
const AI_DEBOUNCE_MS = 15_000;

/** True when any changed field touches content the AI grades, so the
 * recompute should spend an AI call; otherwise completeness-only. */
export function changeRequiresAi(changedFields: readonly string[]): boolean {
  return changedFields.some((field) => {
    if (AI_CONTENT_SCALAR_FIELDS.has(field)) return true;
    if (field.startsWith(SECTION_PREFIX)) {
      return AI_CONTENT_SECTION_KINDS.has(field.slice(SECTION_PREFIX.length));
    }
    return false;
  });
}

/**
 * Fans `ResumeUpdatedEvent` into the `resume-quality` queue. Two
 * decisions are made here:
 *
 *  - **Selective recompute**: completeness always recomputes (cheap), but
 *    the AI sub-score only runs when the change touched gradeable content
 *    (`runAi`). Style / title / language edits recompute completeness and
 *    reuse the previous AI score.
 *  - **Sliding debounce**: AI-bearing recomputes are delayed and the
 *    in-flight delayed job is removed first, so a burst of saves restarts
 *    the timer and collapses into one graded call. Completeness-only
 *    recomputes fire immediately.
 *
 * `jobId` dedupes concurrent enqueues for the same resume.
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
    const runAi = changeRequiresAi(event.payload?.changedFields ?? []);
    const jobId = `resume-quality:${event.aggregateId}`;
    try {
      if (runAi) {
        // Restart the debounce timer: drop any delayed job so this save
        // becomes the new fire point instead of being dropped as a dup.
        await this.queue.remove(RESUME_QUALITY_QUEUE, jobId);
      }
      await this.queue.enqueue<ResumeQualityJobData>(
        RESUME_QUALITY_QUEUE,
        { kind: 'recompute', resumeId: event.aggregateId, sourceEventId: event.eventId, runAi },
        { jobId, delay: runAi ? AI_DEBOUNCE_MS : 0 },
      );
    } catch (err) {
      this.logger.error(
        `Failed to enqueue resume-quality recompute for resume ${event.aggregateId}`,
        {
          context: 'ResumeQualityOnResumeUpdatedHandler',
          stack: err instanceof Error ? err.stack : undefined,
        },
      );
      throw err;
    }
  }
}
