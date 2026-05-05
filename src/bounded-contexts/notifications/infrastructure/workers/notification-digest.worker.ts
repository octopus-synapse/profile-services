import type { DistributedLockPort, LoggerPort } from '@/shared-kernel';
import { runGuardedJob } from '@/shared-kernel/jobs';
import type { NotificationsUseCases } from '../../application/ports/notifications.port';

const CTX = 'NotificationDigestWorker';
// p99: scans + email enqueues complete in <8 minutes on busy days.
const EXPECTED_DURATION_MS = 8 * 60_000;

/**
 * Notification Digest Worker
 *
 * Runs daily at 08:00 UTC and triggers `SendDailyDigestsUseCase` to
 * email each user a roll-up of unread notifications from the last
 * 24 hours, for notification types they've configured with
 * `emailDelivery = 'DAILY'`.
 *
 * Idempotent via `Notification.emailDigestSentAt`. P0-010 adds a
 * distributed lock so the email cap can never be exceeded by parallel
 * pods racing the same digest window.
 *
 * Framework-free POJO. Wired by `registerNotificationsJobs` via
 * `CronPort`.
 */
export class NotificationDigestWorker {
  constructor(
    private readonly bc: NotificationsUseCases,
    private readonly logger: LoggerPort,
    private readonly lock: DistributedLockPort,
  ) {}

  async run(): Promise<void> {
    await runGuardedJob(
      {
        name: CTX,
        expectedDurationMs: EXPECTED_DURATION_MS,
        failureMode: 'LOG_AND_CONTINUE',
        lock: this.lock,
        logger: this.logger,
      },
      async () => {
        const result = await this.bc.sendDailyDigests.execute();
        this.logger.log(
          `Daily digest sent to ${result.usersEmailed} users (${result.notificationsBatched} notifications)`,
          CTX,
        );
      },
    );
  }
}
