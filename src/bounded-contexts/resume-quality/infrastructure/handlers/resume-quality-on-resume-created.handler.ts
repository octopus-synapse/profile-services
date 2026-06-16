import type {
  ResumeCreatedEvent,
  ResumeDuplicatedEvent,
} from '@/bounded-contexts/resumes/domain/events';
import type { LoggerPort } from '@/shared-kernel';
import type { ComputeQualityUseCase } from '../../application/use-cases/compute-quality.use-case';

/**
 * Computes the quality score **synchronously** on resume create /
 * duplicate, so a freshly-created resume already carries a score on the
 * first read (no "missing until first edit" gap). A fresh resume is
 * near-empty → the Content Quality adapter skips the AI call and the
 * compute is fast; a duplicate carries content → the AI runs inline.
 *
 * Bound to `ResumeCreatedEvent` / `ResumeDuplicatedEvent`, both published
 * via the awaited `publish*Async` path, so the score is in place before
 * the POST returns.
 *
 * Failure mode — **swallow** (deliberate exception to the CLAUDE.md
 * "state-mutating handlers rethrow" rule): the quality score is a derived,
 * recomputable projection, not a consistency/regulatory invariant. A
 * scoring hiccup (AI provider down, transient DB error) must NOT fail the
 * resume creation; the score is simply absent and recomputed on the next
 * edit. Same spirit as the `resume-quality-rank.handler.ts` swallow.
 */
export class ResumeQualityOnResumeCreatedHandler {
  constructor(
    private readonly compute: Pick<ComputeQualityUseCase, 'execute'>,
    private readonly logger: LoggerPort,
  ) {}

  async onResumeCreated(event: ResumeCreatedEvent | ResumeDuplicatedEvent): Promise<void> {
    try {
      await this.compute.execute(event.aggregateId);
    } catch (err) {
      this.logger.error(`Inline quality compute failed for resume ${event.aggregateId}`, {
        context: 'ResumeQualityOnResumeCreatedHandler',
        stack: err instanceof Error ? err.stack : undefined,
      });
      // Swallow — see class doc. Score stays absent until the next edit.
    }
  }
}
