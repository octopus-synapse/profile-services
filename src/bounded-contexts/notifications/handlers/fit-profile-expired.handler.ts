import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { UserFitProfileUpdatedEvent } from '@/bounded-contexts/fit-profile/domain/events';

/**
 * Notifications bridge for the fit-profile lockout flow.
 *
 * On a fresh questionnaire submission we stay quiet. On expiry we
 * will fire a "complete o questionário novamente" email + an in-app
 * notification — the architecture is in place but the email copy and
 * the `NotificationType` enum value don't ship until the notifications
 * team signs off on the copy. Until then this handler logs a marker
 * line so we can grep production for missed expiries.
 *
 * The anticipatory 7d / 3d / 1d emails are NOT event-driven — they
 * can't be, since nothing triggers "you're about to expire". They'll
 * land as a cron worker scanning `UserFitProfile.expiresAt` windows;
 * that worker also lives in this context when it ships.
 */
@Injectable()
export class FitProfileExpiredNotificationHandler {
  private readonly logger = new Logger(FitProfileExpiredNotificationHandler.name);

  @OnEvent(UserFitProfileUpdatedEvent.TYPE)
  async handle(event: UserFitProfileUpdatedEvent): Promise<void> {
    if (event.payload.cause !== 'expired') return;
    // TODO(notifications): add `FIT_PROFILE_EXPIRED` to the Prisma
    // NotificationType enum, render the email body (pt-BR + en) and
    // call NotificationService.create + EmailService.sendEmail here.
    this.logger.log(
      `fit-profile expired for user=${event.aggregateId} version=${event.payload.version} — email TODO`,
    );
  }
}
