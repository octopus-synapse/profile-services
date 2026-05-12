import { ResumeQualityComputedEvent } from '@/bounded-contexts/resume-quality/domain/events';
import { LoggerPort } from '@/shared-kernel';
import { NotificationsUseCases } from '../../application/ports/notifications.port';

/**
 * Subscribes to `ResumeQualityComputedEvent` and delegates to
 * `NotifyResumeQualityRankChangeUseCase` which decides whether the
 * fresh score crosses a rank boundary and (when it does) emits the
 * appropriate `RESUME_QUALITY_IMPROVED` / `_REGRESSED` notification.
 */
export class ResumeQualityRankNotificationHandler {
  constructor(
    private readonly bc: NotificationsUseCases,
    private readonly logger: LoggerPort,
  ) {}

  async handle(event: ResumeQualityComputedEvent): Promise<void> {
    // Q13-V3: notification dispatch is best-effort. A transient
    // failure must not abort the event chain — audit /
    // state-mutating handlers in the same chain still rethrow.
    try {
      await this.bc.notifyResumeQualityRankChange.execute({
        resumeId: event.payload.resumeId,
        overallScore: event.payload.overallScore,
      });
    } catch (err) {
      this.logger.error('notifyResumeQualityRankChange failed', {
        context: 'ResumeQualityRankNotificationHandler',
        stack: err instanceof Error ? err.stack : String(err),
        resumeId: event.payload.resumeId,
      });
    }
  }
}
