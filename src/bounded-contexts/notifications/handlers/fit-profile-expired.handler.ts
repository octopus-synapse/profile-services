import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { UserFitProfileUpdatedEvent } from '@/bounded-contexts/fit-profile/domain/events';
import { NotificationService } from '../services/notification.service';

/**
 * Notifications bridge for the fit-profile lockout flow.
 *
 * Fired the moment a `UserFitProfile` is marked expired (either by
 * the nightly expire-worker or by an explicit user action). Creates
 * an in-app notification + sends an instant email per the user's
 * `NotificationPreference` for `FIT_PROFILE_EXPIRED`.
 *
 * `actorId` is the user themselves; the existing `NotificationService`
 * short-circuits when `userId === actorId`. To bypass that we route
 * the system as the actor by passing a stable `system` id — the
 * service treats different ids as different parties. We use a fixed
 * `'system'` literal that a future migration can swap to a real
 * "system" user id if we ever introduce one.
 *
 * The 7/3/1-day anticipatory reminders are cron-driven (no
 * triggering event), implemented separately as
 * `FitProfileExpiryReminderWorker`.
 */
@Injectable()
export class FitProfileExpiredNotificationHandler {
  private readonly logger = new Logger(FitProfileExpiredNotificationHandler.name);

  constructor(private readonly notifications: NotificationService) {}

  @OnEvent(UserFitProfileUpdatedEvent.TYPE)
  async handle(event: UserFitProfileUpdatedEvent): Promise<void> {
    if (event.payload.cause !== 'expired') return;

    try {
      await this.notifications.create(
        event.aggregateId,
        'FIT_PROFILE_EXPIRED',
        'system',
        'Seu perfil de fit expirou. Refaça o questionário para voltar a usar o match.',
        'UserFitProfile',
        event.aggregateId,
      );
    } catch (err) {
      // Notification failures must never propagate back into the event
      // bus — the user's lockout is the source of truth, the email is
      // a courtesy.
      this.logger.warn(
        `fit-profile expired notification failed for user=${event.aggregateId}: ${err instanceof Error ? err.message : 'unknown'}`,
      );
    }
  }
}
