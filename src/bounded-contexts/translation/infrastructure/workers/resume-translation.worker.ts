import type { LoggerPort } from '@/shared-kernel';
import { runWithFailureMode } from '@/shared-kernel/jobs';
import type { TranslateResumeIntoLocaleUseCase } from '../../application/use-cases/translate-resume-into-locale/translate-resume-into-locale.use-case';

export const RESUME_TRANSLATION_QUEUE = 'resume-translation';

export type ResumeTranslationJobData = {
  readonly kind: 'derive';
  readonly resumeId: string;
  readonly sourceEventId?: string;
};

/**
 * Stage 2 of the write-through: the debounced job lands here and the use
 * case derives the résumé into its other locale. Failure retries through the
 * queue adapter's default policy (`DEFAULT_JOB_OPTIONS` in
 * `bullmq-job-queue.adapter.ts`). Registered by the bootstrap's `workers`
 * loop — the same loop the queue-consumers spec guards.
 */
const CTX = 'ResumeTranslationWorker';

export class ResumeTranslationWorker {
  constructor(
    private readonly translate: TranslateResumeIntoLocaleUseCase,
    private readonly logger: LoggerPort,
  ) {}

  async process(job: { data: ResumeTranslationJobData; id?: string }): Promise<void> {
    if (job.data.kind !== 'derive') return;
    this.logger.debug(`Deriving resume ${job.data.resumeId} into its other locale`, CTX);
    await runWithFailureMode({ worker: CTX, logger: this.logger }, 'RETRY', async () => {
      await this.translate.execute(job.data.resumeId);
    });
  }
}
