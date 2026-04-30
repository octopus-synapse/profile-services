import { EventPublisher, LoggerPort } from '@/shared-kernel';
import { ResumeStyleAppliedEvent } from '../../domain/events';
import {
  ResumeNotFoundForStyleApplyError,
  StyleNotFoundError,
} from '../../domain/exceptions/resume-styles.exceptions';
import { ResumeStyleRepositoryPort } from '../../domain/ports/resume-style.repository.port';

export interface ApplyStyleInput {
  readonly userId: string;
  readonly resumeId: string;
  readonly styleId: string;
}

/**
 * Points a Resume at a `ResumeStyle`. Style existence is checked up
 * front so the FK update never silently fails. Ownership is enforced
 * inside the repository's `applyToResume` (`updateMany` scoped to
 * `userId = input.userId`) so a stranger trying to write someone
 * else's resume gets the same 404 a missing resume would produce.
 */
export class ApplyStyleToResumeUseCase {
  constructor(
    private readonly repo: ResumeStyleRepositoryPort,
    private readonly events: EventPublisher,
    private readonly logger: LoggerPort,
  ) {}

  async execute(input: ApplyStyleInput): Promise<void> {
    const style = await this.repo.findById(input.styleId);
    if (!style) throw new StyleNotFoundError(input.styleId);

    const ok = await this.repo.applyToResume(input.resumeId, input.styleId, input.userId);
    if (!ok) throw new ResumeNotFoundForStyleApplyError(input.resumeId);

    this.events.publish(
      new ResumeStyleAppliedEvent(input.resumeId, {
        resumeId: input.resumeId,
        styleId: input.styleId,
        userId: input.userId,
      }),
    );
  }
}
