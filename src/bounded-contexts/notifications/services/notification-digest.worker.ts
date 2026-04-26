import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LoggerPort } from '@/shared-kernel';
import { NotificationService } from './notification.service';

const CTX = 'NotificationDigestWorker';

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
  constructor(
    private readonly notifications: NotificationService,
    private readonly logger: LoggerPort,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async run(): Promise<void> {
    try {
      const result = await this.notifications.sendDailyDigests();
      this.logger.log(
        `Daily digest sent to ${result.usersEmailed} users (${result.notificationsBatched} notifications)`,
        CTX,
      );
    } catch (error) {
      this.logger.error(
        `Daily digest failed: ${error instanceof Error ? error.message : 'unknown'}`,
        error instanceof Error ? error.stack : undefined,
        CTX,
      );
    }
  }
}
