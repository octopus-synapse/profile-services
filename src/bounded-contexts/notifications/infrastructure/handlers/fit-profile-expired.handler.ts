import { UserFitProfileUpdatedEvent } from '@/bounded-contexts/fit-profile/domain/events';
import { LoggerPort } from '@/shared-kernel';
import { NotificationsUseCases } from '../../application/ports/notifications.port';

/**
 * Notifications bridge for the fit-profile lockout flow.
 *
 * Fired when a `UserFitProfile` is marked expired. Delegates to
 * `NotifyFitProfileExpiredUseCase` so the notification logic stays
 * framework-free.
 *
 * The 7/3/1-day anticipatory reminders are cron-driven (no triggering
 * event), implemented separately as `FitProfileExpiryReminderWorker`.
 */
export class FitProfileExpiredNotificationHandler {
  constructor(
    private readonly bc: NotificationsUseCases,
    private readonly logger: LoggerPort,
  ) {}

  async handle(event: UserFitProfileUpdatedEvent): Promise<void> {
    if (event.payload.cause !== 'expired') return;
    // Q13-V3: notification dispatch is best-effort. A transient
    // failure (SMTP hiccup, third-party rate limit) must not abort
    // the event chain, since this handler runs alongside critical
    // state-mutating handlers that rely on uniform `publish`
    // semantics. Audit / state-mutating handlers in the same chain
    // still rethrow.
    try {
      await this.bc.notifyFitProfileExpired.execute({ userId: event.aggregateId });
    } catch (err) {
      this.logger.error('notifyFitProfileExpired failed', {
        context: 'FitProfileExpiredNotificationHandler',
        stack: err instanceof Error ? err.stack : String(err),
        userId: event.aggregateId,
      });
    }
  }
}
