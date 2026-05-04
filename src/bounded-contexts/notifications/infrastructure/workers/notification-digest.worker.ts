import type { LoggerPort } from '@/shared-kernel';
import type { NotificationsUseCases } from '../../application/ports/notifications.port';

const CTX = 'NotificationDigestWorker';

/**
 * Notification Digest Worker
 *
 * Runs daily at 08:00 UTC and triggers `SendDailyDigestsUseCase` to
 * email each user a roll-up of unread notifications from the last
 * 24 hours, for notification types they've configured with
 * `emailDelivery = 'DAILY'`.
 *
 * Idempotent via `Notification.emailDigestSentAt`.
 *
 * Framework-free POJO. Wired by `registerNotificationsJobs` via
 * `CronPort` (Nest cron adapter lives in
 * `infrastructure/nest-adapter/nest-cron.adapter.ts`).
 */
export class NotificationDigestWorker {
  constructor(
    private readonly bc: NotificationsUseCases,
    private readonly logger: LoggerPort,
  ) {}

  async run(): Promise<void> {
    try {
      const result = await this.bc.sendDailyDigests.execute();
      this.logger.log(
        `Daily digest sent to ${result.usersEmailed} users (${result.notificationsBatched} notifications)`,
        CTX,
      );
    } catch (error) {
      this.logger.error(`Daily digest failed: ${error instanceof Error ? error.message : 'unknown'}`, { context: CTX, stack: error instanceof Error ? error.stack : undefined });
    }
  }
}
