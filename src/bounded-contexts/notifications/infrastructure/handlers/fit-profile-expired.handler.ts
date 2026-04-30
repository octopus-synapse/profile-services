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
    await this.bc.notifyFitProfileExpired.execute({ userId: event.aggregateId });
  }
}
