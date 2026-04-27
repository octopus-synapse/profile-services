import { LoggerPort } from '@/shared-kernel';
import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { UserFitProfileUpdatedEvent } from '@/bounded-contexts/fit-profile/domain/events';
import { NotifyFitProfileExpiredUseCase } from '../../application/use-cases/notify-fit-profile-expired/notify-fit-profile-expired.use-case';

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
@Injectable()
export class FitProfileExpiredNotificationHandler {
  constructor(private readonly notifyExpired: NotifyFitProfileExpiredUseCase) {}

  @OnEvent(UserFitProfileUpdatedEvent.TYPE)
  async handle(event: UserFitProfileUpdatedEvent): Promise<void> {
    if (event.payload.cause !== 'expired') return;
    await this.notifyExpired.execute({ userId: event.aggregateId });
  }
}
