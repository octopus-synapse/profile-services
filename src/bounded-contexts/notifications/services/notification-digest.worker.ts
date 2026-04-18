import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationService } from './notification.service';

/**
 * Notification Digest Worker
 *
 * Runs daily at 08:00 UTC and emails each user a roll-up of unread
 * notifications from the last 24 hours, for notification types they've
 * configured with emailDelivery = 'DAILY'.
 *
 * Idempotent via Notification.emailDigestSentAt.
 */
@Injectable()
export class NotificationDigestWorker {
  private readonly logger = new Logger(NotificationDigestWorker.name);

  constructor(private readonly notifications: NotificationService) {}

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async run(): Promise<void> {
    try {
      const result = await this.notifications.sendDailyDigests();
      this.logger.log(
        `Daily digest sent to ${result.usersEmailed} users (${result.notificationsBatched} notifications)`,
      );
    } catch (error) {
      this.logger.error(
        `Daily digest failed: ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }
  }
}
