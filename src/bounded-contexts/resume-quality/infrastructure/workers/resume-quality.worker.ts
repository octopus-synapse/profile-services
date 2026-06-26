import type { LoggerPort } from '@/shared-kernel';
import { runWithFailureMode } from '@/shared-kernel/jobs';
import type { ComputeQualityUseCase } from '../../application/use-cases/compute-quality.use-case';

export const RESUME_QUALITY_QUEUE = 'resume-quality';

export type ResumeQualityJobData = {
  readonly kind: 'recompute';
  readonly resumeId: string;
  /** Correlates the job back to the originating domain event for audit. */
  readonly sourceEventId?: string;
  /** When `false`, the recompute runs the cheap deterministic Completeness
   * rules only and reuses the previous snapshot's AI sub-score — set by the
   * listener when the change didn't touch gradeable content (e.g. style /
   * title edits). Defaults to `true` for backward-compatible jobs. */
  readonly runAi?: boolean;
};

/**
 * Two-stage recompute pipeline.
 *
 * Stage 1 (listener): when a `ResumeUpdatedEvent` is emitted anywhere
 * in the app, enqueue a single job keyed by `resumeId`. BullMQ's
 * `jobId` de-dupes: a burst of saves collapses into one recompute
 * rather than N parallel Content Quality AI calls. The listener lives
 * in a sibling handler file
 * (`infrastructure/handlers/resume-quality-on-resume-updated.handler.ts`).
 *
 * Stage 2 (processor): pick the job up, run `ComputeQualityUseCase`
 * against the current resume state. Failure inside the use-case surfaces
 * through BullMQ's default retry (3 attempts, exponential backoff,
 * configured in AppModule).
 *
 * Framework-free POJO. Wired by the resume-quality module via
 * `JobQueuePort`.
 */
const CTX = 'ResumeQualityWorker';

export class ResumeQualityWorker {
  constructor(
    private readonly compute: ComputeQualityUseCase,
    private readonly logger: LoggerPort,
  ) {}

  async process(job: { data: ResumeQualityJobData; id?: string }): Promise<void> {
    if (job.data.kind !== 'recompute') return;
    const runAi = job.data.runAi ?? true;
    this.logger.debug(
      `Recomputing quality for resumeId=${job.data.resumeId} (runAi=${runAi})`,
      CTX,
    );
    await runWithFailureMode({ worker: CTX, logger: this.logger }, 'RETRY', async () => {
      await this.compute.execute(job.data.resumeId, { runAi });
    });
  }
}
