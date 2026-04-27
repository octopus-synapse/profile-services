import { LoggerPort } from '@/shared-kernel';
import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ResumeQualityComputedEvent } from '@/bounded-contexts/resume-quality/domain/events';
import { NotifyResumeQualityRankChangeUseCase } from '../../application/use-cases/notify-resume-quality-rank-change/notify-resume-quality-rank-change.use-case';

/**
 * Subscribes to `ResumeQualityComputedEvent` and delegates to
 * `NotifyResumeQualityRankChangeUseCase` which decides whether the
 * fresh score crosses a rank boundary and (when it does) emits the
 * appropriate `RESUME_QUALITY_IMPROVED` / `_REGRESSED` notification.
 */
@Injectable()
export class ResumeQualityRankNotificationHandler {
  constructor(
    private readonly notifyRank: NotifyResumeQualityRankChangeUseCase,
    private readonly logger: LoggerPort,
  ) {}

  @OnEvent(ResumeQualityComputedEvent.TYPE)
  async handle(event: ResumeQualityComputedEvent): Promise<void> {
    await this.notifyRank.execute({
      resumeId: event.payload.resumeId,
      overallScore: event.payload.overallScore,
    });
  }
}
